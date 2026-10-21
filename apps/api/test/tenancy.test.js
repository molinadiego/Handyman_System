import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { AppError } from '../src/errors/app-error.js';
import {
  createOwnedWorkspaceMiddleware,
  createOwnerSessionMiddleware,
  serializeSessionCookie,
} from '../src/middleware/owner-session.js';
import { createSameOriginMiddleware } from '../src/middleware/same-origin.js';
import { validateWorkspaceInput } from '../src/models/workspace.model.js';

test('owner session cookie is HttpOnly, SameSite=Lax, and Secure when requested', () => {
  const header = serializeSessionCookie('a'.repeat(43), { secure: true });

  assert.match(header, /HttpOnly/u);
  assert.match(header, /SameSite=Lax/u);
  assert.match(header, /Secure/u);
  assert.match(header, /Max-Age=604800/u);
});

test('owner session resolves by token digest and attaches only verified identity', async () => {
  const token = 'b'.repeat(43);
  let lookup;
  const request = { headers: { cookie: `other=x; handy_session=${token}` } };
  const middleware = createOwnerSessionMiddleware({
    sessionRepository: {
      async findActiveSession(input) {
        lookup = input;
        return {
          id: 'session-id',
          user: { id: 'owner-id', email: 'owner@example.com', emailVerifiedAt: new Date() },
        };
      },
    },
  });
  let nextError;

  await middleware(request, {}, (error) => { nextError = error; });

  assert.equal(nextError, undefined);
  assert.equal(lookup.tokenHash, createHash('sha256').update(token).digest('hex'));
  assert.equal(request.auth.userId, 'owner-id');
  assert.equal(request.auth.sessionId, 'session-id');
  assert.equal('sessionToken' in request.auth, false);
});

test('owned workspace lookup is always scoped to the authenticated owner', async () => {
  let lookup;
  const request = { auth: { userId: 'owner-1' }, params: { workspaceId: 'workspace-2' } };
  const middleware = createOwnedWorkspaceMiddleware({
    workspaceRepository: {
      async findOwnedWorkspace(input) {
        lookup = input;
        return null;
      },
    },
  });
  let nextError;

  await middleware(request, {}, (error) => { nextError = error; });

  assert.deepEqual(lookup, { workspaceId: 'workspace-2', ownerUserId: 'owner-1' });
  assert.ok(nextError instanceof AppError);
  assert.equal(nextError.statusCode, 404);
});

test('unsafe requests require the configured same origin', () => {
  const middleware = createSameOriginMiddleware('https://handy.example');
  let error;
  middleware({ method: 'POST', get: () => 'https://attacker.example' }, {}, (value) => { error = value; });
  assert.equal(error.code, 'INVALID_ORIGIN');

  let acceptedError;
  middleware({ method: 'POST', get: () => 'https://handy.example' }, {}, (value) => { acceptedError = value; });
  assert.equal(acceptedError, undefined);
});

test('workspace requires a name and valid IANA time zone', () => {
  assert.deepEqual(
    validateWorkspaceInput({ name: '  Handy Co  ', timeZone: 'America/Chicago' }),
    { name: 'Handy Co', timeZone: 'America/Chicago' },
  );
  assert.throws(
    () => validateWorkspaceInput({ name: 'Handy Co', timeZone: 'Not/A_Timezone' }),
    { code: 'INVALID_TIME_ZONE' },
  );
});
