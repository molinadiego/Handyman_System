import { AppError } from '../errors/app-error.js';
import {
  validateAdditionalWorkApproval,
  validateAdditionalWorkDecisionReason,
  validateAdditionalWorkInput,
} from '../models/additional-work.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function handleRepositoryError(error) {
  if (error === 'NOT_FOUND') return notFound();
  if (error === 'WORK_ORDER_LOCKED') return new AppError('WORK_ORDER_LOCKED', 'Additional work cannot be recorded on completed or canceled orders.', 409);
  if (error === 'NOT_PENDING') return new AppError('ADDITIONAL_WORK_ALREADY_DECIDED', 'This additional-work request is no longer pending.', 409);
  if (error === 'CONFLICT') return new AppError('ADDITIONAL_WORK_CONFLICT', 'The request changed; reload and try again.', 409);
  return new AppError('ADDITIONAL_WORK_OPERATION_FAILED', 'Could not update the additional-work request.', 500);
}

export function createAdditionalWorkService({ additionalWorkRepository, workOrderRepository, now = () => new Date() }) {
  return {
    async list(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return additionalWorkRepository.list(workspaceId, workOrderId);
    },

    async create({ workspaceId, workOrderId, actorUserId, input }) {
      const data = validateAdditionalWorkInput(input);
      const result = await additionalWorkRepository.create({
        workspaceId,
        workOrderId,
        actorUserId,
        data,
        occurredAt: now(),
      });
      if (result?.error) throw handleRepositoryError(result.error);
      return result.data;
    },

    async approve({ workspaceId, workOrderId, additionalWorkId, actorUserId, input }) {
      const data = validateAdditionalWorkApproval(input);
      const result = await additionalWorkRepository.approve({
        workspaceId,
        workOrderId,
        additionalWorkId,
        actorUserId,
        data,
        occurredAt: now(),
      });
      if (result?.error) throw handleRepositoryError(result.error);
      return result.data;
    },

    async reject({ workspaceId, workOrderId, additionalWorkId, actorUserId, reason }) {
      const data = validateAdditionalWorkDecisionReason(reason);
      const result = await additionalWorkRepository.decide({
        workspaceId,
        workOrderId,
        additionalWorkId,
        actorUserId,
        status: 'REJECTED',
        reason: data,
        occurredAt: now(),
      });
      if (result?.error) throw handleRepositoryError(result.error);
      return result.data;
    },

    async cancel({ workspaceId, workOrderId, additionalWorkId, actorUserId, reason }) {
      const data = validateAdditionalWorkDecisionReason(reason);
      const result = await additionalWorkRepository.decide({
        workspaceId,
        workOrderId,
        additionalWorkId,
        actorUserId,
        status: 'CANCELED',
        reason: data,
        occurredAt: now(),
      });
      if (result?.error) throw handleRepositoryError(result.error);
      return result.data;
    },
  };
}
