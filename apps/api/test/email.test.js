import assert from 'node:assert/strict';
import test from 'node:test';
import { ResendEmailTransport } from '../src/services/resend-email.transport.js';

test('Resend transport sends verification mail through the REST API without logging credentials', async () => {
  let request;
  const transport = new ResendEmailTransport({
    apiKey: 'test-api-key',
    from: 'Handy System <no-reply@example.test>',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true };
    },
  });

  await transport.sendVerificationEmail({
    to: 'owner@example.test',
    link: 'https://app.example.test/verify?token=sample-token',
  });

  assert.equal(request.url, 'https://api.resend.com/emails');
  assert.equal(request.options.headers.Authorization, 'Bearer test-api-key');
  const body = JSON.parse(request.options.body);
  assert.equal(body.from, 'Handy System <no-reply@example.test>');
  assert.deepEqual(body.to, ['owner@example.test']);
  assert.match(body.text, /sample-token/u);
});

test('Resend transport does not reveal provider response details on failure', async () => {
  const transport = new ResendEmailTransport({
    apiKey: 'test-api-key',
    from: 'no-reply@example.test',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'secret provider detail' }),
  });

  await assert.rejects(
    transport.sendPasswordResetEmail({ to: 'owner@example.test', link: 'https://example.test/reset?token=test' }),
    (error) => error.code === 'EMAIL_PROVIDER_HTTP_401' && !error.message.includes('secret'),
  );
});

test('Resend transport reports network failure without exposing request details', async () => {
  const transport = new ResendEmailTransport({
    apiKey: 'test-api-key',
    from: 'no-reply@example.test',
    fetchImpl: async () => { throw new Error('private network details'); },
  });

  await assert.rejects(
    transport.sendPasswordResetEmail({ to: 'owner@example.test', link: 'https://example.test/reset?token=test' }),
    (error) => error.code === 'EMAIL_PROVIDER_UNREACHABLE' && !error.message.includes('private'),
  );
});

test('work order assignment email contains only the order access code and never access credentials', async () => {
  let payload;
  const transport = new ResendEmailTransport({
    apiKey: 'test-api-key',
    from: 'no-reply@example.test',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true };
    },
  });

  await transport.sendWorkOrderAccessCodeEmail({
    to: 'helper@example.test',
    employeeName: 'Helper',
    workOrderNumber: 4,
    code: 'one-order-code',
    link: 'https://app.example.test/assigned-work-order',
  });

  assert.match(payload.text, /one-order-code/u);
  assert.match(payload.text, /only provides access to this order/u);
  assert.doesNotMatch(payload.text, /lockbox value|door code value/u);
  assert.doesNotMatch(payload.html, /lockbox value|door code value/u);
  assert.doesNotMatch(payload.html, /[?&]code=/u);
});

test('appointment change email sends a secure link without lockbox details', async () => {
  let payload;
  const transport = new ResendEmailTransport({
    apiKey: 'test-api-key',
    from: 'no-reply@example.test',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true };
    },
  });

  await transport.sendAppointmentChangeRequestEmail({
    to: 'tenant@example.test',
    workOrderNumber: 31,
    title: 'Repair the gate',
    scheduledAt: 'November 3, 2026 at 1:00 PM',
    link: 'https://app.example.test/appointment-response?token=secret-token',
  });

  assert.match(payload.text, /confirm the appointment or request a reschedule\/cancellation/u);
  assert.match(payload.text, /secret-token/u);
  assert.doesNotMatch(payload.text, /lockbox|door code|access code/u);
  assert.doesNotMatch(payload.html, /lockbox|door code|access code/u);
});
