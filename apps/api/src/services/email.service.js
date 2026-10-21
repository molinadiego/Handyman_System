import { AppError } from '../errors/app-error.js';

export class EmailService {
  constructor(transport = null) {
    this.transport = transport;
  }

  isConfigured() {
    if (typeof this.transport?.isConfigured === 'function') {
      return this.transport.isConfigured();
    }
    return Boolean(this.transport);
  }

  async sendVerificationEmail(message) {
    if (!this.transport) {
      throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
    }
    return this.transport.sendVerificationEmail(message);
  }

  async sendPasswordResetEmail(message) {
    if (!this.transport) {
      throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
    }
    return this.transport.sendPasswordResetEmail(message);
  }
}
