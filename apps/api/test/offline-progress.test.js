import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateOfflineLockboxViewBatch,
  validateOfflineProgressBatch,
  validateOfflineSensitiveResolutionInput,
} from '../src/models/offline-progress.model.js';

test('offline progress batch preserves device time and work order version', () => {
  const [event] = validateOfflineProgressBatch([{
    clientEventId: '8f8bcfac-1e1b-4c83-9b5e-37bd3f9fbd2a',
    stage: 'IN_PROGRESS',
    note: 'Installed the replacement hinge.',
    baseStatus: 'SCHEDULED',
    baseWorkOrderUpdatedAt: '2026-10-22T12:00:00.000Z',
    deviceOccurredAt: '2026-10-22T13:00:00.000Z',
  }]);
  assert.equal(event.requestedStatus, 'IN_PROGRESS');
  assert.equal(event.baseWorkOrderUpdatedAt.toISOString(), '2026-10-22T12:00:00.000Z');
});

test('offline lockbox access events are idempotency-keyed and owner resolution requires a reason', () => {
  const [event] = validateOfflineLockboxViewBatch([{
    clientEventId: 'be64deca-8d20-4dcc-b72a-fbaded31a423',
    credentialId: 'a163e82d-633f-48d2-9e6c-76e6d791bb8e',
    deviceOccurredAt: '2026-10-22T13:00:00.000Z',
  }]);
  assert.equal(event.credentialId, 'a163e82d-633f-48d2-9e6c-76e6d791bb8e');
  assert.throws(() => validateOfflineSensitiveResolutionInput({ decision: 'ACKNOWLEDGE' }), {
    code: 'OFFLINE_RESOLUTION_REASON_REQUIRED',
  });
  assert.deepEqual(validateOfflineSensitiveResolutionInput({ decision: 'DISMISS', reason: 'Duplicated event.' }), {
    decision: 'DISMISS',
    reason: 'Duplicated event.',
  });
});
