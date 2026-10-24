import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import {
  validateAppointmentLinkRecipient,
  validatePublicScheduleChangeInput,
  validateScheduleChangeDecisionReason,
  validateWorkOrderContactInput,
} from '../models/work-order-schedule-change.model.js';
import { workspaceLocalTimeToUtc } from '../models/work-order-schedule.model.js';
import { tokenDigest } from './token-digest.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function scheduleError(error) {
  if (error === 'NOT_FOUND') return notFound();
  if (error === 'NOT_SCHEDULED') return new AppError('APPOINTMENT_NOT_SCHEDULED', 'Schedule the work order before sending appointment options.', 409);
  if (error === 'APPOINTMENT_STARTED') return new AppError('APPOINTMENT_ALREADY_STARTED', 'Appointment options cannot be sent after the scheduled start.', 409);
  if (error === 'INVALID_OR_EXPIRED') return new AppError('APPOINTMENT_LINK_INVALID', 'This appointment link is invalid, expired, or no longer current.', 400);
  if (error === 'NOT_FOUND_OR_NOT_PENDING') return new AppError('SCHEDULE_CHANGE_NOT_PENDING', 'This request is no longer pending.', 409);
  if (error === 'STALE_REQUEST') return new AppError('SCHEDULE_CHANGE_STALE', 'The appointment changed after this request; review the current schedule.', 409);
  if (error === 'RESCHEDULE_DATA_MISSING') return new AppError('SCHEDULE_CHANGE_INVALID', 'The work order has no estimated duration for rescheduling.', 409);
  return new AppError('SCHEDULE_CHANGE_FAILED', 'Could not update the schedule request.', 500);
}

function createRawToken() {
  return randomBytes(32).toString('base64url');
}

function validateAppointmentToken(token) {
  if (typeof token !== 'string' || token.length !== 43 || !/^[A-Za-z0-9_-]+$/u.test(token)) {
    throw new AppError('APPOINTMENT_LINK_INVALID', 'This appointment link is invalid or expired.', 400);
  }
  return token;
}

function publicAppointmentPreview(context) {
  return {
    workOrderNumber: context.workOrderNumber,
    title: context.title,
    propertyAddress: context.propertyAddress,
    scheduledStartAt: context.scheduledStartAt,
    scheduledEndAt: context.scheduledEndAt,
    timeZone: context.timeZone,
    requesterName: context.requesterName,
    estimatedDurationMinutes: context.durationMinutes,
  };
}

export function createWorkOrderSchedulingService({
  schedulingRepository,
  workOrderRepository,
  emailService,
  frontendBaseUrl,
  now = () => new Date(),
  createToken = createRawToken,
}) {
  return {
    async getContact(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return schedulingRepository.getWorkOrderContact(workspaceId, workOrderId);
    },

    async saveContact({ workspaceId, workOrderId, actorUserId, input }) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      const data = validateWorkOrderContactInput(input);
      const result = await schedulingRepository.saveWorkOrderContact({
        workspaceId,
        workOrderId,
        actorUserId,
        data,
        now: now(),
      });
      if (result?.error) throw scheduleError(result.error);
      return result.data;
    },

    async sendAppointmentLink({ workspaceId, workOrderId, actorUserId, language = 'en' }) {
      const workOrder = await workOrderRepository.getWorkOrder(workspaceId, workOrderId);
      if (!workOrder) throw notFound();
      if (!['SCHEDULED', 'RESCHEDULED'].includes(workOrder.status) || !workOrder.scheduledStartAt || !workOrder.scheduledEndAt) {
        throw scheduleError('NOT_SCHEDULED');
      }
      if (workOrder.scheduledStartAt <= now()) throw scheduleError('APPOINTMENT_STARTED');
      const contact = await schedulingRepository.getWorkOrderContact(workspaceId, workOrderId);
      const recipientEmail = workOrder.propertyManagerId
        ? contact?.email
        : (contact?.email ?? workOrder.billToEmailSnapshot);
      const recipient = validateAppointmentLinkRecipient(recipientEmail);
      const recipientName = contact?.name ?? workOrder.billToNameSnapshot;
      const token = createToken();
      const prepared = await schedulingRepository.prepareAppointmentRequestLink({
        workspaceId,
        workOrderId,
        actorUserId,
        tokenHash: tokenDigest(token),
        recipientName,
        recipientEmail: recipient,
        now: now(),
      });
      if (prepared?.error) throw scheduleError(prepared.error);
      const url = new URL('/appointment-response', frontendBaseUrl);
      url.searchParams.set('token', token);
      const formatter = new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
        timeZone: prepared.workOrder.workspace.timeZone,
        dateStyle: 'long',
        timeStyle: 'short',
      });
      let status = 'SENT';
      let failureCode = null;
      try {
        await emailService.sendAppointmentChangeRequestEmail({
          to: recipient,
          workOrderNumber: workOrder.number,
          title: workOrder.title,
          scheduledAt: formatter.format(workOrder.scheduledStartAt),
          link: url.toString(),
          language,
        });
      } catch (error) {
        status = 'FAILED';
        failureCode = error?.code ?? 'EMAIL_SEND_FAILED';
        await schedulingRepository.revokeAppointmentLink({ workspaceId, tokenId: prepared.token.id, now: now() });
      }
      await schedulingRepository.createAppointmentCommunication({
        workspaceId,
        workOrderId,
        recipient,
        status,
        failureCode,
      });
      return { workOrderNumber: workOrder.number, deliveryStatus: status };
    },

    async listRequests(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return schedulingRepository.listScheduleChangeRequests(workspaceId, workOrderId);
    },

    async previewAppointmentLink(rawToken) {
      const token = validateAppointmentToken(rawToken);
      const context = await schedulingRepository.previewAppointmentToken({ tokenHash: tokenDigest(token), now: now() });
      if (!context) throw scheduleError('INVALID_OR_EXPIRED');
      return publicAppointmentPreview(context);
    },

    async submitAppointmentRequest({ token: rawToken, input }) {
      const token = validateAppointmentToken(rawToken);
      const data = validatePublicScheduleChangeInput(input);
      const tokenHash = tokenDigest(token);
      const context = await schedulingRepository.previewAppointmentToken({ tokenHash, now: now() });
      if (!context) throw scheduleError('INVALID_OR_EXPIRED');
      let proposedStartAt = null;
      if (data.type === 'RESCHEDULE') {
        proposedStartAt = workspaceLocalTimeToUtc(data.proposedStartAtLocal, context.timeZone);
        if (proposedStartAt <= now() || proposedStartAt.getTime() === context.scheduledStartAt.getTime()) {
          throw new AppError('INVALID_SCHEDULE_TIME', 'Choose a future time different from the current appointment.', 400);
        }
      }
      const result = await schedulingRepository.submitAppointmentRequest({
        tokenHash,
        type: data.type,
        reason: data.reason,
        proposedStartAt,
        now: now(),
      });
      if (result?.error) throw scheduleError(result.error);
      return result.data;
    },

    async decideRequest({ workspaceId, workOrderId, requestId, actorUserId, decision, reason }) {
      if (!['APPROVE', 'REJECT'].includes(decision)) {
        throw new AppError('INVALID_SCHEDULE_CHANGE_DECISION', 'Choose approve or reject.', 400);
      }
      const decisionReason = decision === 'REJECT'
        ? validateScheduleChangeDecisionReason(reason)
        : (typeof reason === 'string' ? reason.trim().slice(0, 1000) || null : null);
      const result = await schedulingRepository.decideScheduleChange({
        workspaceId,
        workOrderId,
        requestId,
        actorUserId,
        decision,
        decisionReason,
        now: now(),
      });
      if (result?.error) throw scheduleError(result.error);
      return { ...result.data, conflicts: result.conflicts };
    },
  };
}
