import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEmail, normalizeLanguage, validatePassword } from '../src/models/auth.model.js';
import { createAuthService } from '../src/services/auth.service.js';
import { passwordHasher } from '../src/services/password-hasher.js';

test('email is normalized and password policy accepts long passphrases', () => {
  assert.equal(normalizeEmail('  OWNER@Example.COM '), 'owner@example.com');
  assert.equal(normalizeLanguage('es'), 'es');
  assert.throws(() => normalizeLanguage('fr'), { code: 'INVALID_LANGUAGE' });
  assert.equal(validatePassword('correct horse battery staple'), 'correct horse battery staple');
  assert.throws(() => validatePassword('short'), { code: 'INVALID_PASSWORD' });
  assert.throws(() => normalizeEmail('not-an-email'), { code: 'INVALID_EMAIL' });
});

test('password hasher uses Argon2id and verifies the original password', async () => {
  const hash = await passwordHasher.hash('correct horse battery staple');

  assert.match(hash, /^\$argon2id\$/u);
  assert.equal(await passwordHasher.verify(hash, 'correct horse battery staple'), true);
  assert.equal(await passwordHasher.verify(hash, 'a different password'), false);
});

test('owner registration stores a token digest and sends the raw link only through EmailService', async () => {
  const token = 'a'.repeat(43);
  const sentMessages = [];
  let createdRecord;
  const auth = createAuthService({
    repository: {
      async findUserByEmail() { return null; },
      async createUnverifiedUserWithToken(record) { createdRecord = record; },
    },
    passwordHasher: { async hash() { return 'argon-hash'; } },
    emailService: {
      isConfigured() { return true; },
      async sendVerificationEmail(message) { sentMessages.push(message); },
    },
    frontendBaseUrl: 'https://handy.example',
    createToken: () => token,
    now: () => new Date('2026-10-21T12:00:00.000Z'),
  });

  const result = await auth.registerOwner({ email: 'OWNER@example.com', password: 'correct horse battery staple' });

  assert.match(createdRecord.tokenHash, /^[a-f0-9]{64}$/u);
  assert.notEqual(createdRecord.tokenHash, token);
  assert.equal(createdRecord.email, 'owner@example.com');
  assert.equal(createdRecord.preferredLanguage, 'en');
  assert.equal(createdRecord.expiresAt.toISOString(), '2026-10-22T12:00:00.000Z');
  assert.equal(new URL(sentMessages[0].link).searchParams.get('token'), token);
  assert.match(result.message, /instructions will be sent/u);
});

test('owner language preference is validated and persisted through the repository', async () => {
  let update;
  const auth = createAuthService({
    repository: {
      async updateUserPreferredLanguage(input) {
        update = input;
        return { id: input.userId, email: 'owner@example.com', preferredLanguage: input.preferredLanguage };
      },
    },
    passwordHasher: { async hash() { return 'hash'; }, async verify() { return true; } },
    emailService: { isConfigured() { return false; } },
    frontendBaseUrl: 'https://handy.example',
  });

  const user = await auth.updateOwnerLanguage({ userId: 'owner-id', preferredLanguage: 'es' });

  assert.deepEqual(update, { userId: 'owner-id', preferredLanguage: 'es' });
  assert.equal(user.preferredLanguage, 'es');
});

test('unverified owner cannot start a session', async () => {
  const auth = createAuthService({
    repository: {
      async findUserByEmail() {
        return { id: 'user-id', email: 'owner@example.com', passwordHash: 'saved-hash', emailVerifiedAt: null };
      },
    },
    passwordHasher: { async verify() { return true; } },
    emailService: { isConfigured() { return false; } },
    frontendBaseUrl: 'https://handy.example',
  });

  await assert.rejects(
    auth.loginOwner({ email: 'owner@example.com', password: 'correct horse battery staple' }),
    { code: 'INVALID_CREDENTIALS' },
  );
});
