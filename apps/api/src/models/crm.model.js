import { AppError } from '../errors/app-error.js';
import { normalizeEmail } from './auth.model.js';

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

function optionalEmail(value) {
  if (value == null || value === '') return null;
  return normalizeEmail(value);
}

export function validateCustomerInput(input = {}) {
  if (!['PERSON', 'COMPANY'].includes(input.type)) {
    throw new AppError('INVALID_CUSTOMER_TYPE', 'Choose a person or company customer.', 400);
  }
  return {
    type: input.type,
    name: requiredText(input.name, 'name', 160),
    companyName: optionalText(input.companyName, 'company name', 160),
    email: optionalEmail(input.email),
    phone: optionalText(input.phone, 'phone', 40),
    notes: optionalText(input.notes, 'notes', 5000),
  };
}

export function validatePropertyManagerInput(input = {}) {
  return {
    name: requiredText(input.name, 'name', 160),
    companyName: optionalText(input.companyName, 'company name', 160),
    email: optionalEmail(input.email),
    phone: optionalText(input.phone, 'phone', 40),
    notes: optionalText(input.notes, 'notes', 5000),
  };
}

export function validatePropertyInput(input = {}) {
  const country = (input.country ?? 'US').toString().trim().toUpperCase();
  if (!/^[A-Z]{2}$/u.test(country)) {
    throw new AppError('INVALID_COUNTRY', 'Country must be a two-letter code.', 400);
  }

  return {
    addressLine1: requiredText(input.addressLine1, 'address', 200),
    addressLine2: optionalText(input.addressLine2, 'address line 2', 200),
    city: requiredText(input.city, 'city', 120),
    state: requiredText(input.state, 'state', 80),
    postalCode: requiredText(input.postalCode, 'postal code', 20),
    country,
    notes: optionalText(input.notes, 'notes', 5000),
  };
}

export function parseDateOnly(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} must use YYYY-MM-DD format.`, 400);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} must be a valid date.`, 400);
  }
  return date;
}

export function validatePropertyRelationshipInput(input = {}) {
  const hasCustomer = typeof input.customerId === 'string' && input.customerId.length > 0;
  const hasManager = typeof input.propertyManagerId === 'string' && input.propertyManagerId.length > 0;
  if (hasCustomer === hasManager) {
    throw new AppError('INVALID_PROPERTY_RELATIONSHIP', 'Choose exactly one customer or property manager.', 400);
  }

  const role = hasCustomer ? 'OWNER' : 'PROPERTY_MANAGER';
  if (input.role && input.role !== role) {
    throw new AppError('INVALID_PROPERTY_RELATIONSHIP', 'Relationship role does not match the linked party.', 400);
  }

  return {
    customerId: hasCustomer ? input.customerId : null,
    propertyManagerId: hasManager ? input.propertyManagerId : null,
    role,
    startDate: parseDateOnly(input.startDate, 'start date'),
  };
}

export function validateAccessCredentialInput(input = {}) {
  const allowedTypes = ['LOCKBOX', 'DOOR_CODE', 'ACCESS_INSTRUCTIONS', 'KEY_LOCATION', 'OTHER'];
  if (!allowedTypes.includes(input.type)) {
    throw new AppError('INVALID_ACCESS_TYPE', 'Choose a supported property access type.', 400);
  }

  const value = requiredText(input.value, 'access value', 2048);
  return {
    type: input.type,
    label: requiredText(input.label, 'label', 120),
    value,
  };
}
