import { randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { normalizeEmail, normalizeLanguage, validatePassword } from '../models/auth.model.js';
import { tokenDigest } from './token-digest.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GENERIC_REQUEST_MESSAGE = 'If the account can receive this email, instructions will be sent.';

function makeToken() {
  return randomBytes(32).toString('base64url');
}

function actionLink(baseUrl, path, token) {
  const link = new URL(path, baseUrl);
  link.searchParams.set('token', token);
  return link.toString();
}

export function createAuthService({
  repository,
  passwordHasher,
  emailService,
  frontendBaseUrl,
  now = () => new Date(),
  createToken = makeToken,
}) {
  if (!repository || !passwordHasher || !emailService || !frontendBaseUrl) {
    throw new TypeError('Auth service dependencies are required.');
  }

  return {
    async registerOwner({ email: rawEmail, password: rawPassword, preferredLanguage: rawLanguage = 'en' }) {
      const email = normalizeEmail(rawEmail);
      const password = validatePassword(rawPassword);
      const preferredLanguage = normalizeLanguage(rawLanguage);

      if (!emailService.isConfigured()) {
        throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
      }

      const existingUser = await repository.findUserByEmail(email);
      if (!existingUser?.emailVerifiedAt) {
        const passwordHash = existingUser ? null : await passwordHasher.hash(password);
        const token = createToken();
        const expiresAt = new Date(now().getTime() + VERIFICATION_TTL_MS);

        try {
          if (existingUser) {
            await repository.createActionToken({
              userId: existingUser.id,
              purpose: 'EMAIL_VERIFICATION',
              tokenHash: tokenDigest(token),
              expiresAt,
              createdAt: now(),
            });
          } else {
            await repository.createUnverifiedUserWithToken({
              email,
              passwordHash,
              preferredLanguage,
              tokenHash: tokenDigest(token),
              expiresAt,
            });
          }

          await emailService.sendVerificationEmail({
            to: email,
            link: actionLink(frontendBaseUrl, '/verify-email', token),
          });
        } catch (error) {
          // Do not expose account existence or internal persistence details.
          if (error?.code !== 'P2002') throw error;
        }
      }

      return { message: GENERIC_REQUEST_MESSAGE };
    },

    async verifyOwnerEmail(token) {
      if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
        throw new AppError('INVALID_OR_EXPIRED_TOKEN', 'This verification link is invalid or expired.', 400);
      }

      const user = await repository.consumeEmailVerificationToken({
        tokenHash: tokenDigest(token),
        now: now(),
      });

      if (!user) {
        throw new AppError('INVALID_OR_EXPIRED_TOKEN', 'This verification link is invalid or expired.', 400);
      }

      return { id: user.id, email: user.email, emailVerified: true };
    },

    async loginOwner({ email: rawEmail, password: rawPassword }) {
      const email = normalizeEmail(rawEmail);
      const password = validatePassword(rawPassword);
      const user = await repository.findUserByEmail(email);

      if (!user?.emailVerifiedAt || !(await passwordHasher.verify(user.passwordHash, password))) {
        throw new AppError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
      }

      const sessionToken = createToken();
      const expiresAt = new Date(now().getTime() + SESSION_TTL_MS);
      await repository.createSession({
        userId: user.id,
        tokenHash: tokenDigest(sessionToken),
        expiresAt,
      });

      return {
        user: { id: user.id, email: user.email, preferredLanguage: user.preferredLanguage },
        sessionToken,
        expiresAt,
      };
    },

    async updateOwnerLanguage({ userId, preferredLanguage: rawLanguage }) {
      const preferredLanguage = normalizeLanguage(rawLanguage);
      const user = await repository.updateUserPreferredLanguage({ userId, preferredLanguage });
      return { id: user.id, email: user.email, preferredLanguage: user.preferredLanguage };
    },

    async requestPasswordReset(rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!emailService.isConfigured()) {
        throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
      }

      const user = await repository.findUserByEmail(email);
      if (user?.emailVerifiedAt) {
        const token = createToken();
        const expiresAt = new Date(now().getTime() + PASSWORD_RESET_TTL_MS);
        await repository.createActionToken({
          userId: user.id,
          purpose: 'PASSWORD_RESET',
          tokenHash: tokenDigest(token),
          expiresAt,
          createdAt: now(),
        });
        await emailService.sendPasswordResetEmail({
          to: email,
          link: actionLink(frontendBaseUrl, '/reset-password', token),
        });
      }

      return { message: GENERIC_REQUEST_MESSAGE };
    },

    async resetOwnerPassword({ token, password: rawPassword }) {
      const password = validatePassword(rawPassword);
      if (typeof token !== 'string' || token.length < 32 || token.length > 256) {
        throw new AppError('INVALID_OR_EXPIRED_TOKEN', 'This reset link is invalid or expired.', 400);
      }

      const passwordHash = await passwordHasher.hash(password);
      const reset = await repository.resetPasswordWithToken({
        tokenHash: tokenDigest(token),
        passwordHash,
        now: now(),
      });

      if (!reset) {
        throw new AppError('INVALID_OR_EXPIRED_TOKEN', 'This reset link is invalid or expired.', 400);
      }

      return { message: 'Password updated. Please sign in again.' };
    },

    async logoutOwner(sessionToken) {
      if (typeof sessionToken !== 'string' || sessionToken.length < 32) return;
      await repository.revokeSession({ tokenHash: tokenDigest(sessionToken), revokedAt: now() });
    },
  };
}
