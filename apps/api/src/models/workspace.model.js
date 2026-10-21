import { AppError } from '../errors/app-error.js';

export function validateWorkspaceInput({ name, timeZone }) {
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 160) {
    throw new AppError('INVALID_WORKSPACE_NAME', 'Workspace name must be 2–160 characters.', 400);
  }

  if (typeof timeZone !== 'string' || timeZone.length > 64) {
    throw new AppError('INVALID_TIME_ZONE', 'Enter a valid IANA time zone.', 400);
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
  } catch {
    throw new AppError('INVALID_TIME_ZONE', 'Enter a valid IANA time zone.', 400);
  }

  return { name: name.trim(), timeZone };
}
