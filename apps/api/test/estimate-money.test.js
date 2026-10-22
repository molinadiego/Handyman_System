import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEstimateMoney } from '../src/models/estimate-money.model.js';

test('percentage discount is deducted before tax and tax is rounded per document', () => {
  const result = calculateEstimateMoney({
    lines: [{ description: 'Labor', quantity: '2', unitPrice: '50.00' }],
    discountType: 'PERCENTAGE',
    discountValue: '10',
    taxable: true,
    taxRate: '8.25',
    requireComplete: true,
  });

  assert.equal(result.subtotal, '100.00');
  assert.equal(result.discountAmount, '10.00');
  assert.equal(result.taxBase, '90.00');
  assert.equal(result.taxAmount, '7.43');
  assert.equal(result.total, '97.43');
});

test('draft may keep unpriced lines and missing tax rate until send', () => {
  const draft = calculateEstimateMoney({
    lines: [{ description: 'Materials', quantity: 1, unitPrice: null }],
    taxable: true,
    taxRate: null,
  });

  assert.equal(draft.subtotal, null);
  assert.equal(draft.total, null);
  assert.throws(() => calculateEstimateMoney({
    lines: [{ description: 'Materials', quantity: 1, unitPrice: null }],
    taxable: true,
    taxRate: null,
    requireComplete: true,
  }), { code: 'INCOMPLETE_ESTIMATE_PRICE' });
});

test('fixed discount is applied before calculating tax', () => {
  const result = calculateEstimateMoney({
    lines: [{ description: 'Repair', quantity: 1, unitPrice: '100.00' }],
    discountType: 'FIXED_AMOUNT',
    discountValue: '12.50',
    taxable: true,
    taxRate: '10',
    requireComplete: true,
  });

  assert.equal(result.taxBase, '87.50');
  assert.equal(result.taxAmount, '8.75');
  assert.equal(result.total, '96.25');
});
