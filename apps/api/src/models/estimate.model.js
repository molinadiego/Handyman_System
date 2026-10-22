import { AppError } from '../errors/app-error.js';
import { normalizeEmail } from './auth.model.js';

export const SERVICE_REQUEST_STATUSES = [
  'RECEIVED',
  'IN_REVIEW',
  'ESTIMATED',
  'AGREED_DIRECTLY',
  'NOT_ACCEPTED',
  'CLOSED',
];

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} is required and must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function optionalText(value, field, maxLength) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} must be at most ${maxLength} characters.`, 400);
  }
  return value.trim() || null;
}

export function validateServiceRequestInput(input = {}) {
  const hasCustomer = typeof input.customerId === 'string' && input.customerId.length > 0;
  const hasManager = typeof input.propertyManagerId === 'string' && input.propertyManagerId.length > 0;
  if (hasCustomer && hasManager) {
    throw new AppError('INVALID_REQUEST_BILL_TO', 'Choose a customer or property manager, not both.', 400);
  }

  return {
    requesterName: requiredText(input.requesterName, 'requester name', 160),
    requesterEmail: input.requesterEmail ? normalizeEmail(input.requesterEmail) : null,
    requesterPhone: optionalText(input.requesterPhone, 'requester phone', 40),
    customerId: hasCustomer ? input.customerId : null,
    propertyManagerId: hasManager ? input.propertyManagerId : null,
    propertyId: optionalText(input.propertyId, 'property id', 64),
    description: requiredText(input.description, 'description', 10_000),
    notes: optionalText(input.notes, 'notes', 10_000),
  };
}

export function validateServiceRequestStatus(status) {
  if (!SERVICE_REQUEST_STATUSES.includes(status)) {
    throw new AppError('INVALID_REQUEST_STATUS', 'Choose a valid service request status.', 400);
  }
  return status;
}

export function validateEstimateDraftInput(input = {}) {
  const hasCustomer = typeof input.customerId === 'string' && input.customerId.length > 0;
  const hasManager = typeof input.propertyManagerId === 'string' && input.propertyManagerId.length > 0;
  if (hasCustomer === hasManager) {
    throw new AppError('INVALID_ESTIMATE_RECIPIENT', 'Choose exactly one customer or property manager.', 400);
  }
  if (typeof input.propertyId !== 'string' || !input.propertyId) {
    throw new AppError('INVALID_ESTIMATE_PROPERTY', 'A property is required.', 400);
  }
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 100) {
    throw new AppError('INVALID_ESTIMATE_LINES', 'An estimate needs between 1 and 100 line items.', 400);
  }
  if (input.discountType != null && !['FIXED_AMOUNT', 'PERCENTAGE'].includes(input.discountType)) {
    throw new AppError('INVALID_DISCOUNT_TYPE', 'Choose a fixed amount or percentage discount.', 400);
  }

  return {
    customerId: hasCustomer ? input.customerId : null,
    propertyManagerId: hasManager ? input.propertyManagerId : null,
    propertyId: input.propertyId,
    serviceRequestId: optionalText(input.serviceRequestId, 'service request id', 64),
    scopeSnapshot: requiredText(input.scope, 'scope', 10_000),
    taxable: input.taxable === true,
    taxRateOverride: input.taxRate == null || input.taxRate === '' ? null : input.taxRate,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue == null || input.discountValue === '' ? null : input.discountValue,
    lines: input.lines.map((line) => ({
      description: requiredText(line?.description, 'line description', 500),
      quantity: line?.quantity ?? 1,
      unitPrice: line?.unitPrice == null || line.unitPrice === '' ? null : line.unitPrice,
    })),
  };
}

export function validateEstimateRecipients(recipients) {
  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 10) {
    throw new AppError('INVALID_ESTIMATE_RECIPIENTS', 'Choose between 1 and 10 email recipients.', 400);
  }
  return [...new Set(recipients.map((email) => normalizeEmail(email)))];
}
