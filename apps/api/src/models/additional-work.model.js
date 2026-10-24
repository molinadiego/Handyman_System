import { AppError } from '../errors/app-error.js';

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} is required and must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function money(value, field) {
  const raw = typeof value === 'number' ? value.toString() : String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/u.test(raw)) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} must be a non-negative USD amount with at most two decimals.`, 400);
  }
  const [whole, fraction = ''] = raw.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function validateAdditionalWorkInput(input = {}) {
  return {
    title: requiredText(input.title, 'title', 200),
    reason: requiredText(input.reason, 'reason', 1000),
    description: requiredText(input.description, 'description', 10_000),
    estimatedAmount: money(input.estimatedAmount, 'estimated amount'),
  };
}

export function validateAdditionalWorkApproval(input = {}) {
  if (input.confirmation !== true) {
    throw new AppError('ADDITIONAL_WORK_CONFIRMATION_REQUIRED', 'Confirm that the customer explicitly authorized this additional work.', 400);
  }
  if (!['IN_PERSON', 'PHONE'].includes(input.authorizationMethod)) {
    throw new AppError('INVALID_ADDITIONAL_WORK_AUTHORIZATION_METHOD', 'Choose how the customer explicitly authorized the work.', 400);
  }
  return {
    authorizationMethod: input.authorizationMethod,
    authorizedByName: requiredText(input.authorizedByName, 'authorized by', 160),
    authorizationDetails: requiredText(input.authorizationDetails, 'authorization details', 2000),
    approvedAmount: money(input.approvedAmount, 'approved amount'),
  };
}

export function validateAdditionalWorkDecisionReason(reason) {
  return requiredText(reason, 'decision reason', 1000);
}
