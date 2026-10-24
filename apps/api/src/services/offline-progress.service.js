import { AppError } from '../errors/app-error.js';
import {
  validateOfflineLockboxViewBatch,
  validateOfflineProgressBatch,
  validateOfflineResolutionInput,
  validateOfflineSensitiveResolutionInput,
} from '../models/offline-progress.model.js';
import { validateWorkOrderAccessCode } from '../models/employee.model.js';
import { tokenDigest } from './token-digest.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function repositoryError(error) {
  if (error === 'ACCESS_CODE_UNKNOWN') return new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid.', 401);
  if (error === 'OFFLINE_CREDENTIAL_INVALID') return new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or the prepared access detail no longer exists.', 401);
  if (error === 'NOT_FOUND_OR_RESOLVED') return new AppError('OFFLINE_EVENT_NOT_REVIEWABLE', 'This offline event is not awaiting review.', 409);
  if (error === 'WORK_ORDER_TERMINAL') return new AppError('OFFLINE_EVENT_ORDER_TERMINAL', 'The work order is terminal and this event cannot be applied.', 409);
  if (error === 'CONFLICT') return new AppError('OFFLINE_EVENT_CONFLICT', 'The work order changed; reload and review the offline event again.', 409);
  return new AppError('OFFLINE_SYNC_FAILED', 'Could not synchronize offline progress.', 500);
}

export function createOfflineProgressService({ offlineProgressRepository, workOrderRepository, now = () => new Date() }) {
  return {
    async sync({ rawCode, rawEvents, rawLockboxViews }) {
      if (typeof rawCode !== 'string') {
        throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid.', 401);
      }
      const code = validateWorkOrderAccessCode(rawCode);
      const events = validateOfflineProgressBatch(rawEvents);
      const lockboxViews = validateOfflineLockboxViewBatch(rawLockboxViews ?? []);
      if (!events.length && !lockboxViews.length) {
        throw new AppError('INVALID_OFFLINE_EVENT_BATCH', 'There are no offline events to synchronize.', 400);
      }
      const result = await offlineProgressRepository.syncEvents({
        tokenHash: tokenDigest(code),
        events,
        lockboxViews,
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      return result.data;
    },

    async listForOwner(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      const [progressEvents, sensitiveAccessEvents] = await Promise.all([
        offlineProgressRepository.listForOwner(workspaceId, workOrderId),
        offlineProgressRepository.listSensitiveAccessForOwner(workspaceId, workOrderId),
      ]);
      return { progressEvents, sensitiveAccessEvents };
    },

    async resolveForOwner({ workspaceId, workOrderId, eventId, actorUserId, input }) {
      const { decision, reason } = validateOfflineResolutionInput(input);
      const result = await offlineProgressRepository.resolveForOwner({
        workspaceId,
        workOrderId,
        eventId,
        actorUserId,
        decision,
        reason,
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      return result.data;
    },

    async resolveSensitiveAccessForOwner({ workspaceId, workOrderId, eventId, actorUserId, input }) {
      const { decision, reason } = validateOfflineSensitiveResolutionInput(input);
      const result = await offlineProgressRepository.resolveSensitiveAccessForOwner({
        workspaceId,
        workOrderId,
        eventId,
        actorUserId,
        decision,
        reason,
        now: now(),
      });
      if (result?.error) throw repositoryError(result.error);
      return result.data;
    },
  };
}
