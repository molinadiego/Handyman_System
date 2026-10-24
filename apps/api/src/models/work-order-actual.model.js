import { AppError } from '../errors/app-error.js';

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

function parseScaled(value, scale, field) {
  const raw = typeof value === 'number' ? value.toString() : String(value ?? '').trim();
  const match = /^(?:0|[1-9]\d{0,9})(?:\.(\d+))?$/u.exec(raw);
  if (!match || (match[1]?.length ?? 0) > scale) {
    throw new AppError(`INVALID_${field.toUpperCase().replaceAll(' ', '_')}`, `${field} must be a non-negative number with at most ${scale} decimals.`, 400);
  }
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
}

function formatScaled(value, scale) {
  const factor = 10n ** BigInt(scale);
  return `${value / factor}.${(value % factor).toString().padStart(scale, '0')}`;
}

export function validateWorkLogInput(input = {}) {
  const startedAtLocal = input.startedAtLocal;
  const endedAtLocal = input.endedAtLocal;
  if (typeof startedAtLocal !== 'string' || typeof endedAtLocal !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(startedAtLocal)
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(endedAtLocal)) {
    throw new AppError('INVALID_WORK_LOG_TIME', 'Enter valid start and end date/times in the workspace time zone.', 400);
  }
  return {
    startedAtLocal,
    endedAtLocal,
    note: optionalText(input.note, 'work log note', 2000),
  };
}

export function validateMaterialLineInput(input = {}) {
  const quantityScaled = parseScaled(input.quantity, 2, 'quantity');
  if (quantityScaled <= 0n) throw new AppError('INVALID_QUANTITY', 'Quantity must be greater than zero.', 400);
  const unitCostCents = parseScaled(input.unitCost, 2, 'unit cost');
  const actualCostCents = (quantityScaled * unitCostCents + 50n) / 100n;
  const customerCharge = input.customerCharge == null || input.customerCharge === ''
    ? null
    : formatScaled(parseScaled(input.customerCharge, 2, 'customer charge'), 2);
  const payerType = input.payerType;
  if (!['OWNER', 'EMPLOYEE', 'OTHER'].includes(payerType)) {
    throw new AppError('INVALID_MATERIAL_PAYER', 'Choose who paid for this material.', 400);
  }
  const employeeId = optionalText(input.payerEmployeeId, 'payer employee id', 64);
  const payerDescription = optionalText(input.payerDescription, 'payer description', 160);
  if (payerType === 'EMPLOYEE' && !employeeId) {
    throw new AppError('MATERIAL_PAYER_REQUIRED', 'Select the employee who paid.', 400);
  }
  if (payerType !== 'EMPLOYEE' && employeeId) {
    throw new AppError('INVALID_MATERIAL_PAYER', 'Employee payer ID is only valid for an employee payer.', 400);
  }
  if (payerType === 'OTHER' && !payerDescription) {
    throw new AppError('MATERIAL_PAYER_REQUIRED', 'Describe who paid for this material.', 400);
  }

  return {
    description: requiredText(input.description, 'material description', 500),
    quantity: formatScaled(quantityScaled, 2),
    unitCost: formatScaled(unitCostCents, 2),
    actualCost: formatScaled(actualCostCents, 2),
    customerCharge,
    payerType,
    payerEmployeeId: employeeId,
    payerDescription: payerType === 'OTHER' ? payerDescription : null,
  };
}

export function validateWorkOrderAdjustmentInput(input = {}) {
  const type = input.type;
  if (!['SCOPE_CHANGE', 'PRICE_CHANGE', 'TIME_AND_MATERIALS_CHARGE'].includes(type)) {
    throw new AppError('INVALID_ADJUSTMENT_TYPE', 'Choose a valid work order adjustment type.', 400);
  }
  const rawAmount = typeof input.amountDelta === 'number' ? input.amountDelta.toString() : String(input.amountDelta ?? '').trim();
  const match = /^(-?)(?:0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/u.exec(rawAmount);
  if (!match) throw new AppError('INVALID_ADJUSTMENT_AMOUNT', 'Adjustment amount must be a USD amount with at most two decimals.', 400);
  const amountDelta = `${match[1]}${formatScaled(parseScaled(rawAmount.replace(/^-/u, ''), 2, 'adjustment amount'), 2)}`;
  const cents = BigInt(rawAmount.replace(/^-/u, '').replace('.', '').padEnd(3, '0'));
  if (type !== 'SCOPE_CHANGE' && cents === 0n) {
    throw new AppError('INVALID_ADJUSTMENT_AMOUNT', 'Price adjustments must be non-zero.', 400);
  }
  const scopeChange = optionalText(input.scopeChange, 'scope change', 10_000);
  if (type === 'SCOPE_CHANGE' && !scopeChange) {
    throw new AppError('ADJUSTMENT_SCOPE_REQUIRED', 'Describe the scope change.', 400);
  }
  return {
    type,
    amountDelta,
    reason: requiredText(input.reason, 'adjustment reason', 1000),
    scopeChange,
  };
}

export function validateVoidReason(reason) {
  return requiredText(reason, 'void reason', 1000);
}
