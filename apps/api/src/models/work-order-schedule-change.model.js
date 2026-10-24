import { AppError } from '../errors/app-error.js';
import { normalizeEmail } from './auth.model.js';

const CONTACT_TYPES = ['TENANT', 'CUSTOMER_CONTACT', 'OTHER'];
const CHANGE_TYPES = ['CONFIRM', 'RESCHEDULE', 'CANCEL'];

function requiredText(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} is required and must be at most ${maxLength} characters.`, 400);
  }
  return value.trim();
}

function optionalText(value, field, maxLength) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} must be at most ${maxLength} characters.`, 400);
  }
  return value.trim() || null;
}

export function validateWorkOrderContactInput(input = {}) {
  if (!CONTACT_TYPES.includes(input.type)) {
    throw new AppError('INVALID_WORK_ORDER_CONTACT_TYPE', 'Choose a valid appointment contact type.', 400);
  }
  const name = requiredText(input.name, 'contact name', 160);
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = optionalText(input.phone, 'contact phone', 40);
  if (!email && !phone) {
    throw new AppError('WORK_ORDER_CONTACT_METHOD_REQUIRED', 'Add an email or phone number for the appointment contact.', 400);
  }
  return { type: input.type, name, email, phone };
}

export function validateAppointmentLinkRecipient(email) {
  if (typeof email !== 'string' || !email) {
    throw new AppError('SCHEDULE_RECIPIENT_REQUIRED', 'A valid appointment contact email is required to send a change-request link.', 400);
  }
  return normalizeEmail(email);
}

export function validatePublicScheduleChangeInput(input = {}) {
  if (!CHANGE_TYPES.includes(input.type)) {
    throw new AppError('INVALID_SCHEDULE_CHANGE_TYPE', 'Choose reschedule or cancellation.', 400);
  }
  const reason = input.type === 'CONFIRM' ? optionalText(input.reason, 'request note', 1000) : requiredText(input.reason, 'request reason', 1000);
  let proposedStartAtLocal = null;
  if (input.type === 'RESCHEDULE') {
    if (typeof input.proposedStartAtLocal !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(input.proposedStartAtLocal)) {
      throw new AppError('INVALID_SCHEDULE_TIME', 'Enter a valid requested date and time.', 400);
    }
    proposedStartAtLocal = input.proposedStartAtLocal;
  }
  return { type: input.type, reason, proposedStartAtLocal };
}

export function validateScheduleChangeDecisionReason(reason) {
  return requiredText(reason, 'decision reason', 1000);
}
