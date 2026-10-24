import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateMaterialLineInput,
  validateWorkLogInput,
  validateWorkOrderAdjustmentInput,
  validateVoidReason,
} from '../src/models/work-order-actual.model.js';

test('material costs are calculated with decimal arithmetic and customer charge remains explicit', () => {
  const material = validateMaterialLineInput({
    description: 'Fasteners',
    quantity: '2.5',
    unitCost: '3.33',
    customerCharge: '12.50',
    payerType: 'EMPLOYEE',
    payerEmployeeId: 'employee-1',
  });
  assert.equal(material.quantity, '2.50');
  assert.equal(material.actualCost, '8.33');
  assert.equal(material.customerCharge, '12.50');
});

test('material payer and work-order adjustment requirements are enforced', () => {
  assert.throws(() => validateMaterialLineInput({
    description: 'Paint', quantity: '1', unitCost: '20', payerType: 'EMPLOYEE',
  }), { code: 'MATERIAL_PAYER_REQUIRED' });

  assert.throws(() => validateWorkOrderAdjustmentInput({
    type: 'SCOPE_CHANGE', amountDelta: '0', reason: 'Client request',
  }), { code: 'ADJUSTMENT_SCOPE_REQUIRED' });

  const adjustment = validateWorkOrderAdjustmentInput({
    type: 'PRICE_CHANGE', amountDelta: '-25.50', reason: 'Reduced the agreed scope.',
  });
  assert.equal(adjustment.amountDelta, '-25.50');
  assert.equal(validateVoidReason('Duplicate entry'), 'Duplicate entry');
});

test('work logs require start and end local date/time values', () => {
  assert.deepEqual(validateWorkLogInput({
    startedAtLocal: '2026-10-22T08:00',
    endedAtLocal: '2026-10-22T10:30',
    note: 'Repaired the door.',
  }), {
    startedAtLocal: '2026-10-22T08:00',
    endedAtLocal: '2026-10-22T10:30',
    note: 'Repaired the door.',
  });
  assert.throws(() => validateWorkLogInput({ startedAtLocal: 'yesterday' }), { code: 'INVALID_WORK_LOG_TIME' });
});
