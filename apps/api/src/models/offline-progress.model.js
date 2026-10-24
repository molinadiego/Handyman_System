import { AppError } from '../errors/app-error.js';
import { WORK_ORDER_STATUSES } from './work-order.model.js';

function normalizeEvent(input) {
  if (typeof input?.clientEventId !== 'string' || !/^[\da-f-]{36}$/iu.test(input.clientEventId)) {
    throw new AppError('INVALID_OFFLINE_EVENT_ID', 'Offline event ID is invalid.', 400);
  }
  const stage = input.stage == null || input.stage === '' ? null : input.stage;
  if (stage != null && !['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(stage)) {
    throw new AppError('INVALID_WORK_ORDER_PROGRESS', 'Choose a valid work progress update.', 400);
  }
  if (!WORK_ORDER_STATUSES.includes(input.baseStatus)) {
    throw new AppError('INVALID_OFFLINE_BASE_STATUS', 'Offline event base status is invalid.', 400);
  }
  const date = new Date(input.deviceOccurredAt);
  if (typeof input.deviceOccurredAt !== 'string' || !Number.isFinite(date.getTime())) {
    throw new AppError('INVALID_OFFLINE_EVENT_TIME', 'Offline event timestamp is invalid.', 400);
  }
  const baseUpdatedAt = new Date(input.baseWorkOrderUpdatedAt);
  if (typeof input.baseWorkOrderUpdatedAt !== 'string' || !Number.isFinite(baseUpdatedAt.getTime())) {
    throw new AppError('INVALID_OFFLINE_BASE_VERSION', 'Offline work order version is invalid.', 400);
  }
  const note = input.note == null || input.note === '' ? null : input.note;
  if (note != null && (typeof note !== 'string' || note.trim().length > 5000)) {
    throw new AppError('INVALID_OFFLINE_EVENT_NOTE', 'Offline note must be at most 5000 characters.', 400);
  }
  if (!stage && !note) throw new AppError('EMPTY_OFFLINE_EVENT', 'Add an offline progress update or note.', 400);
  return {
    clientEventId: input.clientEventId,
    stage,
    note: note?.trim() || null,
    baseStatus: input.baseStatus,
    baseWorkOrderUpdatedAt: baseUpdatedAt,
    requestedStatus: stage ? (stage === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS') : input.baseStatus,
    deviceOccurredAt: date,
  };
}

export function validateOfflineProgressBatch(events) {
  if (!Array.isArray(events) || events.length > 50) {
    throw new AppError('INVALID_OFFLINE_EVENT_BATCH', 'Sync up to 50 progress events at a time.', 400);
  }
  const normalized = events.map(normalizeEvent);
  const ids = new Set(normalized.map((event) => event.clientEventId));
  if (ids.size !== normalized.length) {
    throw new AppError('DUPLICATE_OFFLINE_EVENT_ID', 'An offline event batch cannot contain duplicate IDs.', 400);
  }
  return normalized;
}

export function validateOfflineLockboxViewBatch(views) {
  if (!Array.isArray(views) || views.length > 50) {
    throw new AppError('INVALID_OFFLINE_EVENT_BATCH', 'Sync up to 50 offline access events at a time.', 400);
  }
  const normalized = views.map((view) => {
    if (typeof view?.clientEventId !== 'string' || !/^[\da-f-]{36}$/iu.test(view.clientEventId)
      || typeof view.credentialId !== 'string' || view.credentialId.length > 64) {
      throw new AppError('INVALID_OFFLINE_EVENT_ID', 'Offline access event ID is invalid.', 400);
    }
    const deviceOccurredAt = new Date(view.deviceOccurredAt);
    if (typeof view.deviceOccurredAt !== 'string' || !Number.isFinite(deviceOccurredAt.getTime())) {
      throw new AppError('INVALID_OFFLINE_EVENT_TIME', 'Offline access timestamp is invalid.', 400);
    }
    return { clientEventId: view.clientEventId, credentialId: view.credentialId, deviceOccurredAt };
  });
  if (new Set(normalized.map((view) => view.clientEventId)).size !== normalized.length) {
    throw new AppError('DUPLICATE_OFFLINE_EVENT_ID', 'An offline access batch cannot contain duplicate IDs.', 400);
  }
  return normalized;
}

export function validateOfflineResolutionInput(input = {}) {
  if (!['APPLY', 'DISMISS'].includes(input.decision)) {
    throw new AppError('INVALID_OFFLINE_RESOLUTION', 'Choose apply or dismiss for the conflict.', 400);
  }
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 1000) {
    throw new AppError('OFFLINE_RESOLUTION_REASON_REQUIRED', 'A reason is required to resolve an offline conflict.', 400);
  }
  return { decision: input.decision, reason: input.reason.trim() };
}

export function validateOfflineSensitiveResolutionInput(input = {}) {
  if (!['ACKNOWLEDGE', 'DISMISS'].includes(input.decision)) {
    throw new AppError('INVALID_OFFLINE_RESOLUTION', 'Choose acknowledge or dismiss for this offline access event.', 400);
  }
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 1000) {
    throw new AppError('OFFLINE_RESOLUTION_REASON_REQUIRED', 'A reason is required to resolve an offline access event.', 400);
  }
  return { decision: input.decision, reason: input.reason.trim() };
}
