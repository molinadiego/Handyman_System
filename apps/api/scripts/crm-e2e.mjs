import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import argon2 from 'argon2';
import { app } from '../src/server-app.js';
import { prisma } from '../src/repositories/prisma-client.js';

const suffix = randomUUID();
const password = `crm-test-${randomUUID()}-passphrase`;
const emails = [`crm-owner-a-${suffix}@example.invalid`, `crm-owner-b-${suffix}@example.invalid`];
const userIds = [];
const workspaceIds = [];
const server = app.listen(0, '127.0.0.1');
let stage = 'seed test records';

async function requestJson(baseUrl, path, { method = 'GET', cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) {
    headers.origin = 'http://localhost:5173';
    headers['content-type'] = 'application/json';
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, body: await response.json().catch(() => ({})) };
}

try {
  process.env.LOCKBOX_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  const seeded = [];

  for (const email of emails) {
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerifiedAt: new Date() },
    });
    userIds.push(user.id);
    const workspace = await prisma.workspace.create({
      data: { ownerUserId: user.id, name: `CRM E2E ${suffix}`, timeZone: 'America/Los_Angeles' },
    });
    workspaceIds.push(workspace.id);
    seeded.push({ user, workspace });
  }

  stage = 'owner login';
  const login = await requestJson(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: emails[0], password },
  });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';', 1)[0];
  const workspaceId = workspaceIds[0];
  const scope = `/api/workspaces/${workspaceId}`;

  stage = 'create customer, manager, and property';
  const customer = await requestJson(baseUrl, `${scope}/customers`, {
    method: 'POST', cookie, body: { type: 'PERSON', name: `Customer ${suffix}` },
  });
  assert.equal(customer.response.status, 201);
  const manager = await requestJson(baseUrl, `${scope}/property-managers`, {
    method: 'POST', cookie, body: { name: `Manager ${suffix}` },
  });
  assert.equal(manager.response.status, 201);
  const property = await requestJson(baseUrl, `${scope}/properties`, {
    method: 'POST',
    cookie,
    body: {
      addressLine1: '100 Test Street',
      city: 'Las Vegas',
      state: 'Nevada',
      postalCode: '89101',
      country: 'US',
    },
  });
  assert.equal(property.response.status, 201);
  const propertyId = property.body.data.id;

  stage = 'enforce relationship workspace boundaries';
  const foreignCustomer = await prisma.customer.create({
    data: { workspaceId: workspaceIds[1], type: 'PERSON', name: `Foreign ${suffix}` },
  });
  const crossWorkspaceLink = await requestJson(baseUrl, `${scope}/properties/${propertyId}/relationships`, {
    method: 'POST', cookie, body: { customerId: foreignCustomer.id, startDate: '2026-01-01' },
  });
  assert.equal(crossWorkspaceLink.response.status, 404);

  const startDate = '2026-01-01';
  const ownerLink = await requestJson(baseUrl, `${scope}/properties/${propertyId}/relationships`, {
    method: 'POST', cookie, body: { customerId: customer.body.data.id, startDate },
  });
  assert.equal(ownerLink.response.status, 201);
  const managerLink = await requestJson(baseUrl, `${scope}/properties/${propertyId}/relationships`, {
    method: 'POST', cookie, body: { propertyManagerId: manager.body.data.id, startDate },
  });
  assert.equal(managerLink.response.status, 201);

  stage = 'encrypt, reveal, and audit lockbox access';
  const credential = await requestJson(baseUrl, `${scope}/properties/${propertyId}/access-credentials`, {
    method: 'POST',
    cookie,
    body: { type: 'LOCKBOX', label: 'Front entry', value: `TEST-${suffix}` },
  });
  assert.equal(credential.response.status, 201);
  const credentialId = credential.body.data.id;
  const storedCredential = await prisma.propertyAccessCredential.findUnique({ where: { id: credentialId } });
  assert.notEqual(storedCredential.ciphertext, `TEST-${suffix}`);

  const metadata = await requestJson(baseUrl, `${scope}/properties/${propertyId}/access-credentials`, { cookie });
  assert.equal(metadata.response.status, 200);
  assert.equal('ciphertext' in metadata.body.data[0], false);
  const revealed = await requestJson(
    baseUrl,
    `${scope}/properties/${propertyId}/access-credentials/${credentialId}/reveal`,
    { method: 'POST', cookie, body: {} },
  );
  assert.equal(revealed.response.status, 200);
  assert.equal(revealed.body.data.value, `TEST-${suffix}`);

  const events = await prisma.sensitiveDataAccessEvent.findMany({ where: { workspaceId, credentialId } });
  assert.equal(events.length, 1);
  assert.equal(events[0].actorUserId, seeded[0].user.id);

  const deactivated = await requestJson(
    baseUrl,
    `${scope}/properties/${propertyId}/access-credentials/${credentialId}/deactivate`,
    { method: 'POST', cookie, body: {} },
  );
  assert.equal(deactivated.response.status, 200);
  const credentialsAfterDeactivate = await requestJson(
    baseUrl,
    `${scope}/properties/${propertyId}/access-credentials`,
    { cookie },
  );
  assert.equal(credentialsAfterDeactivate.body.data.length, 0);

  stage = 'preserve and close relationship history';
  const endDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const ended = await requestJson(
    baseUrl,
    `${scope}/properties/${propertyId}/relationships/${ownerLink.body.data.id}/end`,
    { method: 'POST', cookie, body: { endDate } },
  );
  assert.equal(ended.response.status, 200);
  const history = await requestJson(baseUrl, `${scope}/properties/${propertyId}/relationships`, { cookie });
  assert.equal(history.response.status, 200);
  assert.equal(history.body.data.length, 2);
  assert.ok(history.body.data.find(({ id }) => id === ownerLink.body.data.id).endDate);

  stage = 'reject cross-workspace property access';
  const foreignProperty = await prisma.property.create({
    data: {
      workspaceId: workspaceIds[1],
      addressLine1: '200 Private Street',
      city: 'Las Vegas',
      state: 'Nevada',
      postalCode: '89101',
    },
  });
  const foreignRead = await requestJson(baseUrl, `${scope}/properties/${foreignProperty.id}`, { cookie });
  assert.equal(foreignRead.response.status, 404);

  console.log('CRM E2E passed: workspace isolation, property history, encrypted lockbox, and access audit.');
} catch (error) {
  const safeReason = error?.code ?? error?.name ?? 'UnknownError';
  console.error(`CRM E2E failed during ${stage} (${safeReason}); details suppressed.`);
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  try {
    const workspaceFilter = { workspaceId: { in: workspaceIds } };
    await prisma.sensitiveDataAccessEvent.deleteMany({ where: workspaceFilter });
    await prisma.propertyRelationship.deleteMany({ where: workspaceFilter });
    await prisma.propertyAccessCredential.deleteMany({ where: workspaceFilter });
    await prisma.property.deleteMany({ where: workspaceFilter });
    await prisma.customer.deleteMany({ where: workspaceFilter });
    await prisma.propertyManager.deleteMany({ where: workspaceFilter });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  } catch {
    console.error('CRM E2E cleanup failed; connection details suppressed.');
    process.exitCode = 1;
  }
  delete process.env.LOCKBOX_ENCRYPTION_KEY;
}
