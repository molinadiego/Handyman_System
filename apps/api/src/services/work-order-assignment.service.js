import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { validateAssignmentInput, validateEmployeeProgressInput, validateWorkOrderAccessCode } from '../models/employee.model.js';
import { tokenDigest } from './token-digest.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function makeAccessCode() {
  return randomBytes(32).toString('base64url');
}

function repositoryError(error) {
  if (error === 'NOT_FOUND' || error === 'EMPLOYEE_NOT_FOUND') return notFound();
  if (error === 'EMPLOYEE_EMAIL_REQUIRED') {
    return new AppError('EMPLOYEE_EMAIL_REQUIRED', 'An employee email is required to send the access code.', 400);
  }
  if (error === 'WORK_ORDER_LOCKED') return new AppError('WORK_ORDER_LOCKED', 'Completed or canceled work orders cannot be assigned.', 409);
  if (error === 'ASSIGNMENT_EXISTS') return new AppError('WORK_ORDER_ASSIGNMENT_EXISTS', 'This employee is already assigned to the work order.', 409);
  if (error === 'OWNER_ASSIGNMENT_EXISTS') return new AppError('WORK_ORDER_OWNER_ALREADY_ASSIGNED', 'The owner is already assigned to this work order.', 409);
  if (error === 'NOT_EMPLOYEE_ASSIGNMENT') return new AppError('NOT_EMPLOYEE_ASSIGNMENT', 'Only employee assignments receive access codes.', 400);
  if (error === 'ACCESS_INVALID') return new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
  if (error === 'PROGRESS_FORBIDDEN') return new AppError('WORK_ORDER_PROGRESS_FORBIDDEN', 'This employee is not allowed to update work progress.', 403);
  if (error === 'NOTES_FORBIDDEN') return new AppError('WORK_ORDER_NOTES_FORBIDDEN', 'This employee is not allowed to add notes.', 403);
  if (error === 'PROGRESS_TRANSITION_INVALID') return new AppError('WORK_ORDER_PROGRESS_TRANSITION_INVALID', 'This progress update is not allowed.', 409);
  if (error === 'WORK_ORDER_CONFLICT') return new AppError('WORK_ORDER_STATUS_CONFLICT', 'The work order changed; reload and try again.', 409);
  return null;
}

function publicWorkOrder(workOrder) {
  return {
    id: workOrder.id,
    number: workOrder.number,
    title: workOrder.title,
    scopeSnapshot: workOrder.scopeSnapshot,
    propertyAddressSnapshot: workOrder.propertyAddressSnapshot,
    timeZone: workOrder.workspace.timeZone,
    scheduledStartAt: workOrder.scheduledStartAt,
    scheduledEndAt: workOrder.scheduledEndAt,
    estimatedDurationMinutes: workOrder.estimatedDurationMinutes,
    status: workOrder.status,
    updatedAt: workOrder.updatedAt,
    property: workOrder.property,
    lines: workOrder.lines.map(({ id, position, description, quantity }) => ({ id, position, description, quantity })),
    additionalWork: workOrder.additionalWork,
    progressEvents: workOrder.progressEvents.map(({ id, stage, note, occurredAt }) => ({ id, stage, note, occurredAt })),
  };
}

export function createWorkOrderAssignmentService({
  assignmentRepository,
  crmRepository,
  emailService,
  accessCrypto,
  frontendBaseUrl,
  now = () => new Date(),
  createAccessCode = makeAccessCode,
}) {
  async function deliverAccessCode({ workspaceId, assignment, accessCodeId, employee, workOrder, code, language }) {
    let status = 'SENT';
    let failureCode = null;
    try {
      const link = new URL('/assigned-work-order', frontendBaseUrl).toString();
      await emailService.sendWorkOrderAccessCodeEmail({
        to: employee.email,
        employeeName: employee.name,
        workOrderNumber: workOrder.number,
        code,
        link,
        language,
      });
    } catch (error) {
      status = 'FAILED';
      failureCode = error?.code ?? 'EMAIL_SEND_FAILED';
      await assignmentRepository.revokeAccessCode({ workspaceId, accessCodeId, now: now() });
    }
    const communication = await assignmentRepository.recordAssignmentCommunication({
      workspaceId,
      assignmentId: assignment.id,
      recipient: employee.email,
      status,
      failureCode,
    });
    return { status, communication };
  }

  function getTokenDigest(rawCode) {
    return tokenDigest(validateWorkOrderAccessCode(rawCode));
  }

  return {
    listAssignments(workspaceId, workOrderId) {
      return assignmentRepository.listAssignments(workspaceId, workOrderId);
    },

    async assignOwner({ workspaceId, workOrderId, actorUserId }) {
      const result = await assignmentRepository.createOwnerAssignment({
        workspaceId,
        workOrderId,
        actorUserId,
        activeKey: `owner:${actorUserId}`,
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      return result.assignment;
    },

    async assignEmployee({ workspaceId, workOrderId, actorUserId, employeeId, language = 'en' }) {
      const input = validateAssignmentInput({ employeeId, channel: 'EMAIL' });
      const code = createAccessCode();
      const result = await assignmentRepository.createAssignment({
        workspaceId,
        workOrderId,
        employeeId: input.employeeId,
        actorUserId,
        activeKey: `${workOrderId}:${input.employeeId}`,
        tokenHash: tokenDigest(code),
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      const delivery = await deliverAccessCode({
        workspaceId,
        assignment: result.assignment,
        accessCodeId: result.accessCodeId,
        employee: result.employee,
        workOrder: result.workOrder,
        code,
        language,
      });
      const assignment = await assignmentRepository.listAssignments(workspaceId, workOrderId);
      return { ...assignment.find((item) => item.id === result.assignment.id), deliveryStatus: delivery.status };
    },

    async resendAccessCode({ workspaceId, assignmentId, actorUserId, language = 'en' }) {
      const code = createAccessCode();
      const result = await assignmentRepository.issueNewAccessCode({
        workspaceId,
        assignmentId,
        actorUserId,
        tokenHash: tokenDigest(code),
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      const delivery = await deliverAccessCode({
        workspaceId,
        assignment: { id: assignmentId },
        accessCodeId: result.accessCodeId,
        employee: result.assignment.employee,
        workOrder: result.assignment.workOrder,
        code,
        language,
      });
      const refreshed = await assignmentRepository.getAssignment(workspaceId, assignmentId);
      return { ...refreshed, deliveryStatus: delivery.status };
    },

    async revokeAssignment({ workspaceId, assignmentId }) {
      const assignment = await assignmentRepository.revokeAssignment({ workspaceId, assignmentId, now: now() });
      if (!assignment) throw notFound();
      return assignment;
    },

    async getAssignedWorkOrder(rawCode) {
      const tokenHash = getTokenDigest(rawCode);
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      return {
        employee: {
          name: context.employee.name,
          canUpdateProgress: context.employee.canUpdateProgress,
          canAddNotes: context.employee.canAddNotes,
          canUploadPhotos: context.employee.canUploadPhotos,
          canUploadVideos: context.employee.canUploadVideos,
        },
        assignmentId: context.assignmentId,
        workOrder: publicWorkOrder(context.workOrder),
      };
    },

    async prepareOfflineWorkOrder(rawCode) {
      const tokenHash = getTokenDigest(rawCode);
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      const workOrder = publicWorkOrder(context.workOrder);
      const preparedAccessDetails = [];
      for (const summary of context.workOrder.property.accessData) {
        const credential = await crmRepository.getAccessCredentialForReveal(
          context.workspaceId,
          context.workOrder.property.id,
          summary.id,
        );
        if (!credential) continue;
        const value = accessCrypto.decrypt(credential);
        const recorded = await assignmentRepository.recordSensitiveAccessFromCode({
          tokenHash,
          credentialId: credential.id,
          now: now(),
        });
        if (!recorded) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
        preparedAccessDetails.push({ id: credential.id, type: credential.type, label: credential.label, value });
      }
      return {
        employee: {
          name: context.employee.name,
          canUpdateProgress: context.employee.canUpdateProgress,
          canAddNotes: context.employee.canAddNotes,
          canUploadPhotos: context.employee.canUploadPhotos,
          canUploadVideos: context.employee.canUploadVideos,
        },
        assignmentId: context.assignmentId,
        workOrder: {
          ...workOrder,
          property: { ...workOrder.property, accessData: preparedAccessDetails },
        },
      };
    },

    async recordProgress({ rawCode, input }) {
      const code = getTokenDigest(rawCode);
      const data = validateEmployeeProgressInput(input);
      const result = await assignmentRepository.recordProgressFromAccess({ ...data, tokenHash: code, now: now() });
      if (result?.error) throw repositoryError(result.error);
      return result.data;
    },

    async revealAccessCredential({ rawCode, credentialId }) {
      const tokenHash = getTokenDigest(rawCode);
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      const credential = await crmRepository.getAccessCredentialForReveal(
        context.workspaceId,
        context.workOrder.property.id,
        credentialId,
      );
      if (!credential) throw notFound();
      const value = accessCrypto.decrypt(credential);
      const recorded = await assignmentRepository.recordSensitiveAccessFromCode({
        tokenHash,
        credentialId,
        now: now(),
      });
      if (!recorded) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      return { id: credential.id, type: credential.type, label: credential.label, value };
    },
  };
}
