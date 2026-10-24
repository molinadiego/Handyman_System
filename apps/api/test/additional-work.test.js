import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateAdditionalWorkApproval,
  validateAdditionalWorkInput,
} from '../src/models/additional-work.model.js';

test('additional work is a separate pending record with a reason, scope and estimate', () => {
  const request = validateAdditionalWorkInput({
    title: 'Replace damaged trim',
    reason: 'Rot was discovered after the original scope was opened.',
    description: 'Remove and replace the damaged exterior trim.',
    estimatedAmount: '185',
  });
  assert.equal(request.estimatedAmount, '185.00');
});

test('additional work cannot be marked approved without explicit, documented authorization', () => {
  assert.throws(() => validateAdditionalWorkApproval({
    authorizationMethod: 'PHONE',
    authorizedByName: 'Customer',
    authorizationDetails: 'They agreed on the call.',
    approvedAmount: '185',
    confirmation: false,
  }), { code: 'ADDITIONAL_WORK_CONFIRMATION_REQUIRED' });

  assert.deepEqual(validateAdditionalWorkApproval({
    authorizationMethod: 'PHONE',
    authorizedByName: 'Customer',
    authorizationDetails: 'Customer confirmed the trim replacement and $185.00 amount by phone.',
    approvedAmount: '185',
    confirmation: true,
  }), {
    authorizationMethod: 'PHONE',
    authorizedByName: 'Customer',
    authorizationDetails: 'Customer confirmed the trim replacement and $185.00 amount by phone.',
    approvedAmount: '185.00',
  });
});
