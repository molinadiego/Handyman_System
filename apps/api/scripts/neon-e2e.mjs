import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import argon2 from 'argon2';
import { app } from '../src/server-app.js';
import { prisma } from '../src/repositories/prisma-client.js';

const suffix = randomUUID(); // Isolated synthetic data for this E2E smoke test.
const password = `test-only-${randomUUID()}-passphrase`;
const emails = [`owner-a-${suffix}@example.invalid`, `owner-b-${suffix}@example.invalid`];
const userIds = [];
const workspaceIds = [];
const server = app.listen(0, '127.0.0.1');

try {
  await once(server, 'listening');
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  for (const [index, email] of emails.entries()) {
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerifiedAt: new Date() },
    });
    userIds.push(user.id);

    const workspace = await prisma.workspace.create({
      data: {
        ownerUserId: user.id,
        name: `E2E workspace ${index + 1} ${suffix}`,
        timeZone: 'America/Chicago',
      },
    });
    workspaceIds.push(workspace.id);
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email: emails[0], password }),
  });
  assert.equal(loginResponse.status, 200, 'owner login should succeed');
  const loginBody = await loginResponse.json();
  assert.equal(loginBody.data.email, emails[0]);
  assert.equal(loginBody.data.preferredLanguage, 'en');
  assert.equal('sessionToken' in loginBody.data, false, 'session secret must not be returned in JSON');

  const setCookie = loginResponse.headers.get('set-cookie');
  assert.ok(setCookie?.includes('HttpOnly'));
  const cookie = setCookie.split(';', 1)[0];

  const languageResponse = await fetch(`${baseUrl}/api/auth/preferences/language`, {
    method: 'PATCH',
    headers: {
      cookie,
      origin: 'http://localhost:5173',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ preferredLanguage: 'es' }),
  });
  assert.equal(languageResponse.status, 200);

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie } });
  assert.equal(sessionResponse.status, 200);
  assert.equal((await sessionResponse.json()).data.preferredLanguage, 'es');

  const workspacesResponse = await fetch(`${baseUrl}/api/workspaces`, {
    headers: { cookie },
  });
  assert.equal(workspacesResponse.status, 200);
  const workspacesBody = await workspacesResponse.json();
  assert.deepEqual(workspacesBody.data.map(({ id }) => id), [workspaceIds[0]]);

  const otherWorkspaceResponse = await fetch(`${baseUrl}/api/workspaces/${workspaceIds[1]}`, {
    headers: { cookie },
  });
  assert.equal(otherWorkspaceResponse.status, 404, 'owner must not access another workspace');

  const readinessResponse = await fetch(`${baseUrl}/health/ready`);
  assert.equal(readinessResponse.status, 200);
  assert.deepEqual(await readinessResponse.json(), { status: 'ok', database: 'ok' });

  console.log('Neon E2E passed: login, session cookie, saved language preference, workspace isolation, and PostgreSQL readiness.');
} catch {
  console.error('Neon E2E failed; detailed errors suppressed to avoid exposing connection information.');
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => server.close(resolve));
  try {
    if (workspaceIds.length) {
      await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    }
    if (userIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  } catch {
    console.error('Neon E2E cleanup failed; connection details suppressed.');
    process.exitCode = 1;
  }
}
