import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import {
  validateEstimateDraftInput,
  validateEstimateRecipients,
  validateServiceRequestInput,
  validateServiceRequestStatus,
} from '../models/estimate.model.js';
import { calculateEstimateMoney } from '../models/estimate-money.model.js';
import { tokenDigest } from './token-digest.js';
import { generateEstimatePdf } from './estimate-pdf.service.js';

const ESTIMATE_VALIDITY_MS = 15 * 24 * 60 * 60 * 1000;

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function formatPropertyAddress(property) {
  return [property.addressLine1, property.addressLine2, `${property.city}, ${property.state} ${property.postalCode}`, property.country]
    .filter(Boolean)
    .join(', ');
}

function estimateAcceptanceLink(baseUrl, token) {
  const url = new URL('/estimates/accept', baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

function makeToken() {
  return randomBytes(32).toString('base64url');
}

async function resolveEstimateSnapshot({ workspaceId, input, crmRepository, estimateRepository }) {
  const [workspace, property, customer, propertyManager, serviceRequest] = await Promise.all([
    estimateRepository.getWorkspaceEstimateSettings(workspaceId),
    crmRepository.getProperty(workspaceId, input.propertyId),
    input.customerId ? crmRepository.getCustomer(workspaceId, input.customerId) : null,
    input.propertyManagerId ? crmRepository.getPropertyManager(workspaceId, input.propertyManagerId) : null,
    input.serviceRequestId ? estimateRepository.getServiceRequest(workspaceId, input.serviceRequestId) : null,
  ]);

  if (!workspace || !property || (input.customerId && !customer)
    || (input.propertyManagerId && !propertyManager) || (input.serviceRequestId && !serviceRequest)) {
    throw notFound();
  }
  if (serviceRequest?.propertyId && serviceRequest.propertyId !== property.id) {
    throw new AppError('REQUEST_PROPERTY_MISMATCH', 'Estimate property must match the linked request property.', 400);
  }

  const recipient = customer ?? propertyManager;
  return {
    businessName: workspace.name,
    recipientName: recipient.companyName || recipient.name,
    recipientEmail: recipient.email,
    propertyAddress: formatPropertyAddress(property),
    defaultTaxRate: workspace.defaultTaxRate?.toString() ?? null,
  };
}

function calculateDraftMoney(data, defaultTaxRate) {
  return calculateEstimateMoney({
    lines: data.lines,
    discountType: data.discountType,
    discountValue: data.discountValue,
    taxable: data.taxable,
    taxRate: data.taxRateOverride ?? defaultTaxRate,
    requireComplete: false,
  });
}

export function createEstimateService({
  estimateRepository,
  crmRepository,
  emailService,
  frontendBaseUrl,
  now = () => new Date(),
  createToken = makeToken,
}) {
  return {
    listServiceRequests(workspaceId) {
      return estimateRepository.listServiceRequests(workspaceId);
    },

    async createServiceRequest({ workspaceId, actorUserId, input }) {
      const data = validateServiceRequestInput(input);
      if (data.customerId && !(await crmRepository.getCustomer(workspaceId, data.customerId))) throw notFound();
      if (data.propertyManagerId && !(await crmRepository.getPropertyManager(workspaceId, data.propertyManagerId))) throw notFound();
      if (data.propertyId && !(await crmRepository.getProperty(workspaceId, data.propertyId))) throw notFound();
      return estimateRepository.createServiceRequest({ workspaceId, createdByUserId: actorUserId, data });
    },

    async updateServiceRequestStatus({ workspaceId, requestId, actorUserId, status }) {
      const nextStatus = validateServiceRequestStatus(status);
      const request = await estimateRepository.updateServiceRequestStatus({
        workspaceId,
        requestId,
        actorUserId,
        status: nextStatus,
      });
      if (!request) throw new AppError('REQUEST_STATUS_LOCKED', 'This request was not found or is closed.', 409);
      return request;
    },

    listEstimates(workspaceId) {
      return estimateRepository.listEstimates(workspaceId, now());
    },

    async getEstimate(workspaceId, estimateId) {
      const estimate = await estimateRepository.getEstimate(workspaceId, estimateId);
      if (!estimate) throw notFound();
      return estimate;
    },

    async createEstimateDraft({ workspaceId, actorUserId, input }) {
      const data = validateEstimateDraftInput(input);
      const snapshot = await resolveEstimateSnapshot({ workspaceId, input: data, crmRepository, estimateRepository });
      const money = calculateDraftMoney(data, snapshot.defaultTaxRate);
      return estimateRepository.createEstimateDraft({ workspaceId, createdByUserId: actorUserId, data, snapshot, money });
    },

    async saveEstimateVersion({ workspaceId, estimateId, actorUserId, input }) {
      const current = await estimateRepository.getEstimate(workspaceId, estimateId);
      if (!current) throw notFound();
      if (current.status === 'ACCEPTED' || current.status === 'REJECTED') {
        throw new AppError('ESTIMATE_LOCKED', 'Accepted or rejected estimates cannot be edited.', 409);
      }
      const data = validateEstimateDraftInput(input);
      const snapshot = await resolveEstimateSnapshot({ workspaceId, input: data, crmRepository, estimateRepository });
      const money = calculateDraftMoney(data, snapshot.defaultTaxRate);
      const updated = await estimateRepository.saveEstimateVersion({ workspaceId, estimateId, actorUserId, data, snapshot, money });
      if (!updated || updated.locked) throw new AppError('ESTIMATE_LOCKED', 'This estimate cannot be edited.', 409);
      return updated;
    },

    async downloadEstimatePdf({ workspaceId, estimateId, language = 'en' }) {
      const estimate = await estimateRepository.getEstimate(workspaceId, estimateId);
      if (!estimate) throw notFound();
      const version = estimate.versions[0];
      if (!version) throw new AppError('ESTIMATE_VERSION_NOT_FOUND', 'Estimate version was not found.', 404);
      return {
        filename: `PRE-${estimate.number}-v${version.versionNumber}.pdf`,
        buffer: await generateEstimatePdf({ estimate, version, language }),
      };
    },

    async sendEstimate({ workspaceId, estimateId, actorUserId, recipients: rawRecipients, language = 'en' }) {
      if (!emailService.isConfigured()) {
        throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
      }
      const recipients = validateEstimateRecipients(rawRecipients);
      const estimate = await estimateRepository.getEstimate(workspaceId, estimateId);
      if (!estimate) throw notFound();
      if (estimate.status === 'ACCEPTED' || estimate.status === 'REJECTED') {
        throw new AppError('ESTIMATE_LOCKED', 'Accepted or rejected estimates cannot be sent again.', 409);
      }
      const version = estimate.versions[0];
      if (!version || version.versionNumber !== estimate.currentVersionNumber) {
        throw new AppError('ESTIMATE_VERSION_NOT_FOUND', 'Current estimate version was not found.', 404);
      }

      const workspace = await estimateRepository.getWorkspaceEstimateSettings(workspaceId);
      const effectiveTaxRate = version.taxRateOverride?.toString() ?? workspace?.defaultTaxRate?.toString() ?? null;
      const money = calculateEstimateMoney({
        lines: version.lines,
        discountType: version.discountType,
        discountValue: version.discountValue?.toString() ?? null,
        taxable: version.taxable,
        taxRate: effectiveTaxRate,
        requireComplete: true,
      });
      const token = createToken();
      const expiresAt = new Date(now().getTime() + ESTIMATE_VALIDITY_MS);
      const pdfBuffer = await generateEstimatePdf({ estimate, version: { ...version, ...money, expiresAt }, language });
      const prepared = await estimateRepository.prepareEstimateSend({
        workspaceId,
        estimateId,
        actorUserId,
        versionId: version.id,
        versionNumber: version.versionNumber,
        tokenHash: tokenDigest(token),
        expiresAt,
        money,
        now: now(),
      });
      if (!prepared) throw new AppError('ESTIMATE_LOCKED', 'This estimate version can no longer be sent.', 409);

      const acceptanceLink = estimateAcceptanceLink(frontendBaseUrl, token);
      let sentCount = 0;
      let failedCount = 0;
      for (const recipient of recipients) {
        let status = 'SENT';
        let failureCode = null;
        try {
          await emailService.sendEstimateEmail({
            to: recipient,
            estimateNumber: estimate.number,
            acceptanceLink,
            pdfBuffer,
            language,
          });
          sentCount += 1;
        } catch (error) {
          status = 'FAILED';
          failureCode = error?.code ?? 'EMAIL_SEND_FAILED';
          failedCount += 1;
        }
        await estimateRepository.createEstimateCommunication({
          workspaceId,
          estimateId,
          estimateVersionId: version.id,
          recipient,
          status,
          failureCode,
        });
      }

      return { estimateNumber: estimate.number, versionNumber: version.versionNumber, sentCount, failedCount };
    },

    async acceptEstimate(token) {
      if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
        throw new AppError('ESTIMATE_LINK_INVALID', 'This estimate link is invalid or expired.', 400);
      }
      const accepted = await estimateRepository.acceptEstimateToken({ tokenHash: tokenDigest(token), now: now() });
      if (!accepted) throw new AppError('ESTIMATE_LINK_INVALID', 'This estimate link is invalid or expired.', 400);
      return accepted;
    },

    async rejectEstimate({ workspaceId, estimateId, actorUserId, reason }) {
      if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000) {
        throw new AppError('REJECTION_REASON_REQUIRED', 'A reason is required to reject an estimate.', 400);
      }
      const rejected = await estimateRepository.rejectEstimate({
        workspaceId,
        estimateId,
        actorUserId,
        reason: reason.trim(),
        now: now(),
      });
      if (!rejected) throw new AppError('ESTIMATE_LOCKED', 'This estimate cannot be rejected.', 409);
      return rejected;
    },
  };
}
