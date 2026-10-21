import { AppError } from '../errors/app-error.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizeEmail(value) {
  if (typeof value !== 'string') {
    throw new AppError('INVALID_EMAIL', 'Enter a valid email address.', 400);
  }

  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new AppError('INVALID_EMAIL', 'Enter a valid email address.', 400);
  }

  return email;
}

export function validatePassword(value) {
  if (typeof value !== 'string') {
    throw new AppError('INVALID_PASSWORD', 'Password must be 12–128 characters.', 400);
  }

  const length = Array.from(value).length;
  if (length < 12 || length > 128) {
    throw new AppError('INVALID_PASSWORD', 'Password must be 12–128 characters.', 400);
  }

  return value;
}

export function normalizeLanguage(value) {
  if (value === 'en' || value === 'es') return value;
  throw new AppError('INVALID_LANGUAGE', 'Choose English or Spanish.', 400);
}
