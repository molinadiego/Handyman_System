import { AppError } from '../errors/app-error.js';

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  const status = error instanceof AppError
    ? error.statusCode
    : Number.isInteger(error.status) && error.status >= 400 && error.status < 500
      ? error.status
      : 500;
  const isAppError = error instanceof AppError;
  const isExpectedError = isAppError && status < 500;

  response.status(status).json({
    error: {
      code: isAppError ? error.code : status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
      message: isExpectedError
        ? error.message
        : status >= 500
          ? 'An unexpected error occurred.'
          : 'The request could not be processed.',
    },
  });
}
