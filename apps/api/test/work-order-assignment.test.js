import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createWorkOrderAssignmentService } from '../src/services/work-order-assignment.service.js';

test('assignment sends a one-order code by email and never returns or stores it in plain text', async () => {
  const rawCode = 'a'.repeat(43);
  let savedHash;
  let sentMessage;
  const service = createWorkOrderAssignmentService({
    assignmentRepository: {
      async createAssignment(input) {
        savedHash = input.tokenHash;
        return {
          assignment: { id: 'assignment-1', employeeId: input.employeeId },
          accessCodeId: 'code-row-1',
          employee: { id: input.employeeId, name: 'Helper', email: 'helper@example.test' },
          workOrder: { id: 'order-1', number: 17 },
        };
      },
      async recordAssignmentCommunication(input) { return { id: 'communication-1', status: input.status }; },
      async listAssignments() { return [{ id: 'assignment-1', employee: { name: 'Helper' } }]; },
    },
    workOrderRepository: {},
    employeeRepository: {},
    crmRepository: {},
    emailService: {
      async sendWorkOrderAccessCodeEmail(message) { sentMessage = message; },
    },
    accessCrypto: {},
    frontendBaseUrl: 'https://app.example.test',
    createAccessCode: () => rawCode,
    now: () => new Date('2026-10-22T12:00:00.000Z'),
  });

  const result = await service.assignEmployee({
    workspaceId: 'workspace-1',
    workOrderId: 'order-1',
    actorUserId: 'owner-1',
    employeeId: 'employee-1',
  });

  assert.equal(savedHash, createHash('sha256').update(rawCode).digest('hex'));
  assert.equal(sentMessage.code, rawCode);
  assert.equal(sentMessage.link, 'https://app.example.test/assigned-work-order');
  assert.equal(result.id, 'assignment-1');
  assert.equal(JSON.stringify(result).includes(rawCode), false);
  assert.equal(JSON.stringify(result).includes(savedHash), false);
});

test('failed access-code delivery revokes the code and records only a safe provider code', async () => {
  const calls = [];
  const service = createWorkOrderAssignmentService({
    assignmentRepository: {
      async createAssignment() {
        return {
          assignment: { id: 'assignment-1' },
          accessCodeId: 'code-row-1',
          employee: { id: 'employee-1', name: 'Helper', email: 'helper@example.test' },
          workOrder: { id: 'order-1', number: 17 },
        };
      },
      async revokeAccessCode(input) { calls.push(['revoke', input.accessCodeId]); },
      async recordAssignmentCommunication(input) { calls.push(['communication', input.status, input.failureCode]); return input; },
      async listAssignments() { return [{ id: 'assignment-1' }]; },
    },
    workOrderRepository: {},
    employeeRepository: {},
    crmRepository: {},
    emailService: { async sendWorkOrderAccessCodeEmail() { throw Object.assign(new Error('private details'), { code: 'EMAIL_PROVIDER_UNREACHABLE' }); } },
    accessCrypto: {},
    frontendBaseUrl: 'https://app.example.test',
    createAccessCode: () => 'b'.repeat(43),
  });

  const result = await service.assignEmployee({
    workspaceId: 'workspace-1',
    workOrderId: 'order-1',
    actorUserId: 'owner-1',
    employeeId: 'employee-1',
  });

  assert.equal(result.deliveryStatus, 'FAILED');
  assert.deepEqual(calls, [
    ['revoke', 'code-row-1'],
    ['communication', 'FAILED', 'EMAIL_PROVIDER_UNREACHABLE'],
  ]);
});

test('employee access resolves to one sanitized work order and hashes the supplied code', async () => {
  const rawCode = 'c'.repeat(43);
  let requestedHash;
  const service = createWorkOrderAssignmentService({
    assignmentRepository: {
      async findActiveAccessByTokenHash(hash) {
        requestedHash = hash;
        return {
          accessCodeId: 'internal-code-row',
          workspaceId: 'workspace-1',
          assignmentId: 'assignment-1',
          employee: {
            name: 'Helper',
            email: 'private@example.test',
            canUpdateProgress: true,
            canAddNotes: true,
            canUploadPhotos: false,
            canUploadVideos: false,
          },
          workOrder: {
            id: 'order-1',
            number: 18,
            title: 'Repair door',
            scopeSnapshot: 'Repair the door.',
            propertyAddressSnapshot: '1 Main St',
            timeZone: 'America/Chicago',
            workspace: { timeZone: 'America/Chicago' },
            property: { accessData: [{ id: 'lockbox-1', label: 'Front lockbox', type: 'LOCKBOX' }] },
            lines: [{ id: 'line-1', position: 1, description: 'Labor', quantity: '2', unitPrice: '200.00' }],
            progressEvents: [{ id: 'progress-1', stage: 'STARTED', assignmentId: 'secret-assignment-id' }],
          },
        };
      },
    },
    workOrderRepository: {},
    employeeRepository: {},
    crmRepository: {},
    emailService: {},
    accessCrypto: {},
    frontendBaseUrl: 'https://app.example.test',
  });

  const result = await service.getAssignedWorkOrder(rawCode);

  assert.equal(requestedHash, createHash('sha256').update(rawCode).digest('hex'));
  assert.equal(result.workOrder.lines[0].description, 'Labor');
  assert.equal('unitPrice' in result.workOrder.lines[0], false);
  assert.equal(JSON.stringify(result).includes('private@example.test'), false);
  assert.equal(JSON.stringify(result).includes('secret-assignment-id'), false);
  assert.equal(JSON.stringify(result).includes('internal-code-row'), false);
});
