import { AppError } from '../errors/app-error.js';

function escapeHtml(value) {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export class ResendEmailTransport {
  constructor({
    apiKey = process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL,
    fetchImpl = fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.from = from;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.from);
  }

  async sendVerificationEmail({ to, link }) {
    const safeLink = escapeHtml(link);
    return this.send({
      to,
      subject: 'Verify your Handy System email',
      text: `Verify your email address by opening this link: ${link}`,
      html: `<p>Verify your Handy System email address:</p><p><a href="${safeLink}">Verify email</a></p>`,
    });
  }

  async sendPasswordResetEmail({ to, link }) {
    const safeLink = escapeHtml(link);
    return this.send({
      to,
      subject: 'Reset your Handy System password',
      text: `Reset your password by opening this link: ${link}`,
      html: `<p>We received a request to reset your Handy System password:</p><p><a href="${safeLink}">Reset password</a></p>`,
    });
  }

  async send({ to, subject, text, html }) {
    if (!this.isConfigured()) {
      throw new AppError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email delivery is not configured.', 503);
    }

    let response;
    try {
      response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, to: [to], subject, text, html }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppError('EMAIL_PROVIDER_UNREACHABLE', 'Email could not be delivered.', 502);
    }

    if (!response.ok) {
      // Provider response bodies may contain sensitive diagnostic details; do not log or relay them.
      throw new AppError(`EMAIL_PROVIDER_HTTP_${response.status}`, 'Email could not be delivered.', 502);
    }

    return true;
  }
}
