import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validatePublicScheduleChangeInput,
  validateWorkOrderContactInput,
} from '../src/models/work-order-schedule-change.model.js';

test('appointment contact normalizes email and requires at least one contact method', () => {
  assert.deepEqual(validateWorkOrderContactInput({
    type: 'TENANT',
    name: 'Tenant Contact',
    email: 'TENANT@example.test',
    phone: '',
  }), {
    type: 'TENANT',
    name: 'Tenant Contact',
    email: 'tenant@example.test',
    phone: null,
  });
  assert.throws(() => validateWorkOrderContactInput({ type: 'TENANT', name: 'Tenant' }), {
    code: 'WORK_ORDER_CONTACT_METHOD_REQUIRED',
  });
});

test('schedule link supports direct confirmation and pending reschedule/cancel requests', () => {
  assert.deepEqual(validatePublicScheduleChangeInput({ type: 'CONFIRM' }), {
    type: 'CONFIRM',
    reason: null,
    proposedStartAtLocal: null,
  });
  assert.deepEqual(validatePublicScheduleChangeInput({
    type: 'RESCHEDULE',
    reason: 'Need a later appointment.',
    proposedStartAtLocal: '2026-11-03T13:00',
  }), {
    type: 'RESCHEDULE',
    reason: 'Need a later appointment.',
    proposedStartAtLocal: '2026-11-03T13:00',
  });
  assert.throws(() => validatePublicScheduleChangeInput({ type: 'CANCEL' }), {
    code: 'INVALID_REQUEST_REASON',
  });
});
