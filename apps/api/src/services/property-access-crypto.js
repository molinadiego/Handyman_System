import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppError } from '../errors/app-error.js';

const ALGORITHM = 'aes-256-gcm';

function getKey(keyValue = process.env.LOCKBOX_ENCRYPTION_KEY) {
  if (typeof keyValue !== 'string' || !keyValue) {
    throw new AppError('LOCKBOX_KEY_NOT_CONFIGURED', 'Property access encryption is not configured.', 503);
  }

  const key = Buffer.from(keyValue, 'base64');
  if (key.length !== 32) {
    throw new AppError('LOCKBOX_KEY_INVALID', 'Property access encryption is not configured correctly.', 503);
  }
  return key;
}

export function createPropertyAccessCrypto({ keyProvider = () => process.env.LOCKBOX_ENCRYPTION_KEY } = {}) {
  return {
    encrypt(plaintext) {
      if (typeof plaintext !== 'string' || !plaintext) {
        throw new AppError('INVALID_ACCESS_VALUE', 'Access value cannot be empty.', 400);
      }

      const nonce = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, getKey(keyProvider()), nonce);
      const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        ciphertext: ciphertext.toString('base64'),
        nonce: nonce.toString('base64'),
        authTag: authTag.toString('base64'),
        keyVersion: 1,
      };
    },

    decrypt(record) {
      try {
        const decipher = createDecipheriv(
          ALGORITHM,
          getKey(keyProvider()),
          Buffer.from(record.nonce, 'base64'),
        );
        decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));
        return Buffer.concat([
          decipher.update(Buffer.from(record.ciphertext, 'base64')),
          decipher.final(),
        ]).toString('utf8');
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('ACCESS_VALUE_UNAVAILABLE', 'Property access value is unavailable.', 500);
      }
    },
  };
}
