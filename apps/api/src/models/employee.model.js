import { AppError } from '../errors/app-error.js';
import { normalizeEmail } from './auth.model.js';

function optionalText(value, field, maxLength) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} must be at most ${maxLength} characters.`, 400);
  }
  return value.trim() || null;
}

function booleanField(value, field, defaultValue) {
  if (value == null) return defaultValue;
  if (typeof value !== 'boolean') throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} must be true or false.`, 400);
  return value;
}

export function validateEmployeeInput(input = {}) {
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 160) {
    throw new AppError('INVALID_EMPLOYEE_NAME', 'Employee name is required and must be at most 160 characters.', 400);
  }
  let email = null;
  if (input.email) email = normalizeEmail(input.email);
  const calendarColor = optionalText(input.calendarColor, 'calendar color', 32);
  if (calendarColor && !/^#[\da-f]{6}$/iu.test(calendarColor)) {
    throw new AppError('INVALID_EMPLOYEE_CALENDAR_COLOR', 'Calendar color must be a six-digit hex color.', 400);
  }
  return {
    name: input.name.trim(),
    email,
    phone: optionalText(input.phone, 'phone', 40),
    calendarColor,
    canUpdateProgress: booleanField(input.canUpdateProgress, 'can update progress', true),
    canAddNotes: booleanField(input.canAddNotes, 'can add notes', true),
    canUploadPhotos: booleanField(input.canUploadPhotos, 'can upload photos', false),
    canUploadVideos: booleanField(input.canUploadVideos, 'can upload videos', false),
    isActive: booleanField(input.isActive, 'active', true),
  };
}

export function validateAssignmentInput(input = {}) {
  if (typeof input.employeeId !== 'string' || !input.employeeId || input.employeeId.length > 64) {
    throw new AppError('INVALID_ASSIGNMENT_EMPLOYEE', 'Choose an employee.', 400);
  }
  if (input.channel !== 'EMAIL') {
    throw new AppError('UNSUPPORTED_ASSIGNMENT_CHANNEL', 'Email is the only configured work order access channel.', 400);
  }
  return { employeeId: input.employeeId, channel: 'EMAIL' };
}

export function validateWorkOrderAccessCode(code) {
  if (typeof code !== 'string' || code.length < 32 || code.length > 256 || !/^[A-Za-z0-9_-]+$/u.test(code)) {
    throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
  }
  return code;
}

export function validateEmployeeProgressInput(input = {}) {
  const stage = input.stage == null || input.stage === '' ? null : input.stage;
  if (stage != null && !['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(stage)) {
    throw new AppError('INVALID_WORK_ORDER_PROGRESS', 'Choose a valid work progress update.', 400);
  }
  const note = optionalText(input.note, 'note', 5000);
  if (!stage && !note) {
    throw new AppError('EMPTY_WORK_ORDER_PROGRESS', 'Add a progress update or note.', 400);
  }
  return { stage, note };
}
