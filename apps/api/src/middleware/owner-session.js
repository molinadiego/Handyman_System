import { AppError } from '../errors/app-error.js';
import { tokenDigest } from '../services/token-digest.js';

export const OWNER_SESSION_COOKIE = 'handy_session';

function readCookie(header, name) {
  if (typeof header !== 'string') return null;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export function readOwnerSessionToken(request) {
  return readCookie(request.headers.cookie, OWNER_SESSION_COOKIE);
}

export function serializeSessionCookie(token, { secure = process.env.NODE_ENV === 'production' } = {}) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/u.test(token)) {
    throw new TypeError('Session token must be a base64url token.');
  }

  const attributes = [
    `${OWNER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function clearSessionCookie({ secure = process.env.NODE_ENV === 'production' } = {}) {
  const attributes = [
    `${OWNER_SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function createOwnerSessionMiddleware({ sessionRepository, now = () => new Date() }) {
  return async function requireOwnerSession(request, _response, next) {
    const token = readOwnerSessionToken(request);
    if (!token || token.length < 32) {
      return next(new AppError('AUTH_REQUIRED', 'Authentication is required.', 401));
    }

    const session = await sessionRepository.findActiveSession({
      tokenHash: tokenDigest(token),
      now: now(),
    });

    if (!session || !session.user?.emailVerifiedAt) {
      return next(new AppError('AUTH_REQUIRED', 'Authentication is required.', 401));
    }

    request.auth = {
      userId: session.user.id,
      email: session.user.email,
      preferredLanguage: session.user.preferredLanguage,
      sessionId: session.id,
    };
    return next();
  };
}

export function createOwnedWorkspaceMiddleware({ workspaceRepository, paramName = 'workspaceId' }) {
  return async function requireOwnedWorkspace(request, _response, next) {
    if (!request.auth?.userId) {
      return next(new AppError('AUTH_REQUIRED', 'Authentication is required.', 401));
    }

    const workspace = await workspaceRepository.findOwnedWorkspace({
      workspaceId: request.params[paramName],
      ownerUserId: request.auth.userId,
    });

    if (!workspace) {
      return next(new AppError('WORKSPACE_NOT_FOUND', 'Workspace was not found.', 404));
    }

    request.workspace = workspace;
    return next();
  };
}
