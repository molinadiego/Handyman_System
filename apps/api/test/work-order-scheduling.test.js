import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkOrderSchedulingService } from '../src/services/work-order-scheduling.service.js';

function makeWorkOrder({ propertyManagerId = null, contact = null } = {}) {
  return {
    id: 'work-order-1',
    number: 4,
    title: 'Repair gate',
    status: 'SCHEDULED',
    scheduledStartAt: new Date('2026-11-03T18:00:00.000Z'),
    scheduledEndAt: new Date('2026-11-03T19:00:00.000Z'),
    propertyManagerId,
    billToNameSnapshot: propertyManagerId ? 'Property Manager' : 'Customer',
    billToEmailSnapshot: propertyManagerId ? 'manager@example.test' : 'customer@example.test',
    contact,
  };
}

test('managed-property appointment links require the designated access contact, not the manager email', async () => {
  let didSend = false;
  const service = createWorkOrderSchedulingService({
    workOrderRepository: { async getWorkOrder() { return makeWorkOrder({ propertyManagerId: 'manager-1' }); } },
    schedulingRepository: { async getWorkOrderContact() { return null; } },
    emailService: { async sendAppointmentChangeRequestEmail() { didSend = true; } },
    frontendBaseUrl: 'https://app.example.test',
  });

  await assert.rejects(
    () => service.sendAppointmentLink({ workspaceId: 'workspace-1', workOrderId: 'work-order-1', actorUserId: 'owner-1' }),
    { code: 'SCHEDULE_RECIPIENT_REQUIRED' },
  );
  assert.equal(didSend, false);
});

test('appointment options are emailed to a stored tenant contact and the token is not returned', async () => {
  const token = 't'.repeat(43);
  let email;
  let storedHash;
  let communication;
  const service = createWorkOrderSchedulingService({
    workOrderRepository: {
      async getWorkOrder() {
        return makeWorkOrder({
          propertyManagerId: 'manager-1',
          contact: { name: 'Tenant', email: 'tenant@example.test', type: 'TENANT' },
        });
      },
    },
    schedulingRepository: {
      async getWorkOrderContact() { return { name: 'Tenant', email: 'tenant@example.test', type: 'TENANT' }; },
      async prepareAppointmentRequestLink(input) {
        storedHash = input.tokenHash;
        return { token: { id: 'token-row' }, workOrder: { number: 4, title: 'Repair gate', workspace: { timeZone: 'America/Chicago' } } };
      },
      async createAppointmentCommunication(input) { communication = input; },
    },
    emailService: { async sendAppointmentChangeRequestEmail(input) { email = input; } },
    frontendBaseUrl: 'https://app.example.test',
    createToken: () => token,
    now: () => new Date('2026-11-01T12:00:00.000Z'),
  });

  const result = await service.sendAppointmentLink({ workspaceId: 'workspace-1', workOrderId: 'work-order-1', actorUserId: 'owner-1' });
  assert.equal(email.to, 'tenant@example.test');
  assert.match(email.link, /^https:\/\/app\.example\.test\/appointment-response\?token=/u);
  assert.equal(storedHash.length, 64);
  assert.notEqual(storedHash, token);
  assert.equal(communication.recipient, 'tenant@example.test');
  assert.equal(result.deliveryStatus, 'SENT');
  assert.equal(JSON.stringify(result).includes(token), false);
});
