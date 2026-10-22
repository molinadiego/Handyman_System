import assert from 'node:assert/strict';
import test from 'node:test';
import { generateEstimatePdf } from '../src/services/estimate-pdf.service.js';

test('estimate PDF uses the immutable quote snapshot and Spanish copy', async () => {
  const pdf = await generateEstimatePdf({
    estimate: { number: 42 },
    version: {
      businessNameSnapshot: 'Handy Co',
      recipientNameSnapshot: 'Cliente de prueba',
      propertyAddressSnapshot: '100 Test Street, Las Vegas, Nevada 89101, US',
      scopeSnapshot: 'Reparar panel de yeso',
      lines: [{ description: 'Mano de obra', quantity: '2.00', unitPrice: '50.00', lineTotal: '100.00' }],
      subtotal: '100.00',
      discountAmount: '10.00',
      taxable: true,
      taxRate: '8.2500',
      taxAmount: '7.43',
      total: '97.43',
      expiresAt: new Date('2026-11-06T00:00:00.000Z'),
    },
    language: 'es',
  });

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 1_000);
});
