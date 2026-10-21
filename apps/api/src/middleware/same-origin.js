import { AppError } from '../errors/app-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createSameOriginMiddleware(allowedOrigin) {
  const normalizedAllowedOrigin = new URL(allowedOrigin).origin;

  return function requireSameOrigin(request, _response, next) {
    if (SAFE_METHODS.has(request.method)) return next();

    const origin = request.get('origin');
    if (origin !== normalizedAllowedOrigin) {
      return next(new AppError('INVALID_ORIGIN', 'Request origin is not allowed.', 403));
    }

    return next();
  };
}
