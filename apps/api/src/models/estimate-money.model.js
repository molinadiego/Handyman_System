import { AppError } from '../errors/app-error.js';

function parseScaled(value, scale, field) {
  const raw = typeof value === 'number' ? value.toString() : String(value ?? '').trim();
  const match = /^(\d+)(?:\.(\d+))?$/u.exec(raw);
  if (!match || (match[2]?.length ?? 0) > scale) {
    throw new AppError(`INVALID_${field.toUpperCase()}`, `${field} must be a non-negative number with at most ${scale} decimals.`, 400);
  }
  const factor = 10n ** BigInt(scale);
  const fraction = (match[2] ?? '').padEnd(scale, '0');
  return BigInt(match[1]) * factor + BigInt(fraction || '0');
}

function roundDivide(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

function centsString(cents) {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function decimalString(value, scale) {
  const factor = 10n ** BigInt(scale);
  return `${value / factor}.${(value % factor).toString().padStart(scale, '0')}`;
}

export function calculateEstimateMoney({ lines, discountType, discountValue, taxable, taxRate, requireComplete = false }) {
  const normalizedLines = lines.map((line) => {
    const quantityScaled = parseScaled(line.quantity ?? 1, 2, 'quantity');
    if (quantityScaled <= 0n) throw new AppError('INVALID_QUANTITY', 'Quantity must be greater than zero.', 400);
    if (line.unitPrice == null) {
      if (requireComplete) throw new AppError('INCOMPLETE_ESTIMATE_PRICE', 'Enter a price for every line item before sending.', 400);
      return { description: line.description, quantity: decimalString(quantityScaled, 2), unitPrice: null, lineTotal: null };
    }

    const priceCents = parseScaled(line.unitPrice, 2, 'unit price');
    const lineCents = roundDivide(quantityScaled * priceCents, 100n);
    return {
      description: line.description,
      quantity: decimalString(quantityScaled, 2),
      unitPrice: centsString(priceCents),
      lineTotal: centsString(lineCents),
      lineCents,
    };
  });

  const complete = normalizedLines.every((line) => line.lineCents != null);
  if (!complete && !requireComplete) {
    return {
      lines: normalizedLines.map(({ lineCents, ...line }) => line),
      subtotal: null,
      discountValue: discountValue == null ? null : decimalString(parseScaled(discountValue, 4, 'discount value'), 4),
      discountAmount: null,
      taxable,
      taxRate: taxRate == null ? null : decimalString(parseScaled(taxRate, 4, 'tax rate'), 4),
      taxBase: null,
      taxAmount: null,
      total: null,
    };
  }

  const subtotalCents = normalizedLines.reduce((total, line) => total + line.lineCents, 0n);
  let discountCents = 0n;
  let normalizedDiscountValue = null;
  if (discountType) {
    if (discountValue == null) throw new AppError('INVALID_DISCOUNT_VALUE', 'Enter the discount value.', 400);
    const discountScaled = parseScaled(discountValue, 4, 'discount value');
    normalizedDiscountValue = decimalString(discountScaled, 4);
    if (discountType === 'FIXED_AMOUNT') {
      const amountCents = parseScaled(discountValue, 2, 'discount amount');
      discountCents = amountCents;
    } else {
      if (discountScaled > 1_000_000n) throw new AppError('INVALID_DISCOUNT_VALUE', 'Percentage discount cannot exceed 100%.', 400);
      discountCents = roundDivide(subtotalCents * discountScaled, 1_000_000n);
    }
  }
  if (discountCents > subtotalCents) {
    throw new AppError('DISCOUNT_EXCEEDS_SUBTOTAL', 'Discount cannot exceed the subtotal.', 400);
  }

  const taxBaseCents = subtotalCents - discountCents;
  let taxRateScaled = null;
  let taxCents = 0n;
  let taxIsComplete = true;
  if (taxable) {
    if (taxRate == null || taxRate === '') {
      if (requireComplete) {
        throw new AppError('TAX_RATE_REQUIRED', 'Set a tax rate for this taxable estimate.', 400);
      }
      taxIsComplete = false;
    } else {
      taxRateScaled = parseScaled(taxRate, 4, 'tax rate');
      if (taxRateScaled > 1_000_000n) throw new AppError('INVALID_TAX_RATE', 'Tax rate cannot exceed 100%.', 400);
      taxCents = roundDivide(taxBaseCents * taxRateScaled, 1_000_000n);
    }
  }

  return {
    lines: normalizedLines.map(({ lineCents, ...line }) => line),
    subtotal: centsString(subtotalCents),
    discountValue: normalizedDiscountValue,
    discountAmount: centsString(discountCents),
    taxable,
    taxRate: taxRateScaled == null ? null : decimalString(taxRateScaled, 4),
    taxBase: centsString(taxBaseCents),
    taxAmount: taxIsComplete ? centsString(taxCents) : null,
    total: taxIsComplete ? centsString(taxBaseCents + taxCents) : null,
  };
}
