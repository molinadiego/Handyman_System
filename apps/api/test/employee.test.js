import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAssignmentInput, validateEmployeeInput, validateWorkOrderAccessCode } from '../src/models/employee.model.js';

test('employee permissions default to progress and notes, with media uploads disabled', () => {
  const employee = validateEmployeeInput({ name: 'Helper', email: 'HELPER@example.test' });
  assert.equal(employee.email, 'helper@example.test');
  assert.equal(employee.canUpdateProgress, true);
  assert.equal(employee.canAddNotes, true);
  assert.equal(employee.canUploadPhotos, false);
  assert.equal(employee.canUploadVideos, false);
});

test('assignment currently requires the configured email channel and access codes are validated', () => {
  assert.deepEqual(validateAssignmentInput({ employeeId: 'employee-1', channel: 'EMAIL' }), {
    employeeId: 'employee-1',
    channel: 'EMAIL',
  });
  assert.throws(() => validateAssignmentInput({ employeeId: 'employee-1', channel: 'SMS' }), {
    code: 'UNSUPPORTED_ASSIGNMENT_CHANNEL',
  });
  assert.equal(validateWorkOrderAccessCode('a'.repeat(43)), 'a'.repeat(43));
  assert.throws(() => validateWorkOrderAccessCode('short'), { code: 'WORK_ORDER_ACCESS_INVALID' });
});
