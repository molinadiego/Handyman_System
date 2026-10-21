import { createHash } from 'node:crypto';

export function tokenDigest(token) {
  return createHash('sha256').update(token).digest('hex');
}
