import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateDirectWorkOrderInput,
  validateScheduleInput,
  validateWorkOrderPriority,
  validateWorkOrderStatusChange,
} from '../src/models/work-order.model.js';

test('direct work order requires exactly one bill-to party, a property, scope and pricing mode', () => {
  assert.throws(() => validateDirectWorkOrderInput({}), { code: 'INVALID_WORK_ORDER_RECIPIENT' });
  assert.throws(() => validateDirectWorkOrderInput({ customerId: 'customer-1' }), { code: 'INVALID_WORK_ORDER_PROPERTY' });

  const valid = validateDirectWorkOrderInput({
    customerId: 'customer-1',
    propertyId: 'property-1',
    title: 'Repair gate',
    scope: 'Replace the damaged gate latch.',
    pricingType: 'FIXED',
    agreedTotal: '240',
  });
  assert.equal(valid.agreedTotal, '240.00');
  assert.equal(valid.pricingType, 'FIXED');
});

test('priority values and estimated schedule duration are validated', () => {
  assert.equal(validateWorkOrderPriority('URGENT'), 'URGENT');
  assert.throws(() => validateWorkOrderPriority('ASAP'), { code: 'INVALID_WORK_ORDER_PRIORITY' });
  assert.deepEqual(validateScheduleInput({
    startAtLocal: '2026-11-02T09:00',
    durationMinutes: '90',
  }), {
    startAtLocal: '2026-11-02T09:00',
    durationMinutes: 90,
    reason: null,
  });
  assert.throws(() => validateScheduleInput({
    startAtLocal: '2026-11-02T09:00',
    durationMinutes: 10,
  }), { code: 'INVALID_SCHEDULE_DURATION' });
});

test('scheduled state is set by the scheduling flow and cancellation requires a reason', () => {
  assert.throws(() => validateWorkOrderStatusChange({
    currentStatus: 'PENDING_SCHEDULE',
    nextStatus: 'SCHEDULED',
  }), { code: 'INVALID_WORK_ORDER_TRANSITION' });
  assert.throws(() => validateWorkOrderStatusChange({
    currentStatus: 'PENDING_SCHEDULE',
    nextStatus: 'CANCELED',
  }), { code: 'WORK_ORDER_REASON_REQUIRED' });

  assert.equal(validateWorkOrderStatusChange({
    currentStatus: 'PENDING_SCHEDULE',
    nextStatus: 'CANCELED',
    reason: 'Customer canceled the request.',
  }), 'Customer canceled the request.');

  assert.equal(validateWorkOrderStatusChange({
    currentStatus: 'IN_PROGRESS',
    nextStatus: 'PENDING_SCHEDULE',
    reason: 'Customer needs to confirm access.',
  }), 'Customer needs to confirm access.');

  assert.throws(() => validateWorkOrderStatusChange({
    currentStatus: 'COMPLETED',
    nextStatus: 'IN_PROGRESS',
  }), { code: 'INVALID_WORK_ORDER_TRANSITION' });
});
