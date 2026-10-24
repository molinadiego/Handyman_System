import { AppError } from '../errors/app-error.js';

export const WORK_ORDER_STATUSES = [
  'PENDING_SCHEDULE',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'RESCHEDULED',
  'CANCELED',
];

const NEXT_STATUSES = {
  PENDING_SCHEDULE: ['CANCELED'],
  SCHEDULED: ['IN_PROGRESS', 'RESCHEDULED', 'CANCELED'],
  IN_PROGRESS: ['COMPLETED', 'PENDING_SCHEDULE', 'RESCHEDULED', 'CANCELED'],
  RESCHEDULED: ['IN_PROGRESS', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
};

export const WORK_ORDER_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} is required and must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function optionalId(value, field) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 64) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} is invalid.`, 400);
  }
  return value;
}

function normalizeMoney(value) {
  if (value == null || value === '') return null;
  const raw = typeof value === 'number' ? value.toString() : String(value).trim();
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u.test(raw)) {
    throw new AppError('INVALID_AGREED_TOTAL', 'Agreed amount must be a non-negative USD amount with at most two decimals.', 400);
  }
  const [whole, fraction = ''] = raw.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function validateDirectWorkOrderInput(input = {}) {
  const hasCustomer = typeof input.customerId === 'string' && input.customerId.length > 0;
  const hasManager = typeof input.propertyManagerId === 'string' && input.propertyManagerId.length > 0;
  if (hasCustomer === hasManager) {
    throw new AppError('INVALID_WORK_ORDER_RECIPIENT', 'Choose exactly one customer or property manager.', 400);
  }
  if (typeof input.propertyId !== 'string' || !input.propertyId) {
    throw new AppError('INVALID_WORK_ORDER_PROPERTY', 'A property is required.', 400);
  }
  if (!['FIXED', 'TIME_AND_MATERIALS'].includes(input.pricingType)) {
    throw new AppError('INVALID_WORK_ORDER_PRICING_TYPE', 'Choose fixed price or time and materials.', 400);
  }

  return {
    customerId: hasCustomer ? input.customerId : null,
    propertyManagerId: hasManager ? input.propertyManagerId : null,
    propertyId: input.propertyId,
    serviceRequestId: optionalId(input.serviceRequestId, 'service request id'),
    title: requiredText(input.title, 'title', 200),
    scopeSnapshot: requiredText(input.scope, 'scope', 10_000),
    pricingType: input.pricingType,
    agreedTotal: normalizeMoney(input.agreedTotal),
  };
}

export function validateWorkOrderStatusChange({ currentStatus, nextStatus, reason }) {
  if (!WORK_ORDER_STATUSES.includes(nextStatus)) {
    throw new AppError('INVALID_WORK_ORDER_STATUS', 'Choose a valid work order status.', 400);
  }
  if (!NEXT_STATUSES[currentStatus]?.includes(nextStatus)) {
    throw new AppError('INVALID_WORK_ORDER_TRANSITION', 'This work order cannot move to that status.', 409);
  }

  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (['CANCELED', 'RESCHEDULED', 'PENDING_SCHEDULE'].includes(nextStatus) && !normalizedReason) {
    throw new AppError('WORK_ORDER_REASON_REQUIRED', 'A reason is required for cancellation or an incomplete/rescheduled job.', 400);
  }
  if (normalizedReason.length > 1000) {
    throw new AppError('INVALID_WORK_ORDER_REASON', 'Reason must be at most 1000 characters.', 400);
  }
  return normalizedReason || null;
}

export function validateWorkOrderPriority(priority) {
  if (!WORK_ORDER_PRIORITIES.includes(priority)) {
    throw new AppError('INVALID_WORK_ORDER_PRIORITY', 'Choose a valid work order priority.', 400);
  }
  return priority;
}

export function validateScheduleInput({ startAtLocal, durationMinutes, reason }) {
  if (typeof startAtLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(startAtLocal)) {
    throw new AppError('INVALID_SCHEDULE_TIME', 'Enter a valid date and time in the workspace time zone.', 400);
  }
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration > 10_080) {
    throw new AppError('INVALID_SCHEDULE_DURATION', 'Estimated duration must be between 15 minutes and 7 days.', 400);
  }
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (normalizedReason.length > 1000) {
    throw new AppError('INVALID_SCHEDULE_REASON', 'Reason must be at most 1000 characters.', 400);
  }
  return { startAtLocal, durationMinutes: duration, reason: normalizedReason || null };
}
