import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrismaCrmRepository } from '../src/repositories/prisma-crm.repository.js';
import { createPropertyAccessCrypto } from '../src/services/property-access-crypto.js';
import { createCrmService } from '../src/services/crm.service.js';

test('CRM repository always scopes customer queries to the active workspace', async () => {
  let query;
  const repository = createPrismaCrmRepository({
    customer: {
      async findMany(value) { query = value; return []; },
    },
  });

  await repository.listCustomers('workspace-a');

  assert.deepEqual(query.where, { workspaceId: 'workspace-a' });
});

test('property relationships require exactly one same-workspace party', async () => {
  const service = createCrmService({
    repository: {
      async getProperty() { return { id: 'property-a' }; },
      async getCustomer() { return null; },
      async getPropertyManager() { return null; },
    },
    accessCrypto: {},
  });

  await assert.rejects(
    service.createPropertyRelationship('workspace-a', 'property-a', {
      customerId: 'customer-a',
      propertyManagerId: 'manager-a',
      role: 'OWNER',
      startDate: '2026-01-01',
    }),
    { code: 'INVALID_PROPERTY_RELATIONSHIP' },
  );

  await assert.rejects(
    service.createPropertyRelationship('workspace-a', 'property-a', {
      customerId: 'customer-other-workspace',
      startDate: '2026-01-01',
    }),
    { code: 'RESOURCE_NOT_FOUND' },
  );
});

test('property access values are encrypted and authenticated with AES-256-GCM', () => {
  const key = Buffer.alloc(32, 7).toString('base64');
  const cipher = createPropertyAccessCrypto({ keyProvider: () => key });
  const encrypted = cipher.encrypt('Lockbox 3812');

  assert.notEqual(encrypted.ciphertext, 'Lockbox 3812');
  assert.equal(cipher.decrypt(encrypted), 'Lockbox 3812');
  assert.throws(
    () => createPropertyAccessCrypto({ keyProvider: () => Buffer.alloc(32, 8).toString('base64') }).decrypt(encrypted),
    { code: 'ACCESS_VALUE_UNAVAILABLE' },
  );
});

test('missing lockbox key fails closed', () => {
  const cipher = createPropertyAccessCrypto({ keyProvider: () => undefined });
  assert.throws(() => cipher.encrypt('code'), { code: 'LOCKBOX_KEY_NOT_CONFIGURED' });
});

test('revealing a lockbox records an audit event without returning ciphertext', async () => {
  let auditEvent;
  const service = createCrmService({
    repository: {
      async getAccessCredentialForReveal() {
        return {
          id: 'credential-1',
          type: 'LOCKBOX',
          label: 'Front door',
          ciphertext: 'ciphertext-placeholder',
        };
      },
      async recordSensitiveDataAccess(event) { auditEvent = event; },
    },
    accessCrypto: { decrypt: () => '3812' },
    now: () => new Date('2026-10-22T12:00:00.000Z'),
  });

  const result = await service.revealAccessCredential('workspace-a', 'property-a', 'credential-1', 'owner-a');

  assert.equal(result.value, '3812');
  assert.equal('ciphertext' in result, false);
  assert.deepEqual(auditEvent, {
    workspaceId: 'workspace-a',
    credentialId: 'credential-1',
    actorUserId: 'owner-a',
    occurredAt: new Date('2026-10-22T12:00:00.000Z'),
  });
});
