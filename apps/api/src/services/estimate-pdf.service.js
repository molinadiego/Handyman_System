import PDFDocument from 'pdfkit';

const copy = {
  en: {
    estimate: 'Estimate',
    recipient: 'Prepared for',
    property: 'Work property',
    scope: 'Scope of work',
    items: 'Items',
    quantity: 'Qty',
    unitPrice: 'Unit price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    expires: 'Valid until',
  },
  es: {
    estimate: 'Presupuesto',
    recipient: 'Preparado para',
    property: 'Propiedad del trabajo',
    scope: 'Alcance del trabajo',
    items: 'Partidas',
    quantity: 'Cant.',
    unitPrice: 'Precio unitario',
    amount: 'Importe',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    tax: 'Impuesto',
    total: 'Total',
    expires: 'Válido hasta',
  },
};

function formatCurrency(value, language) {
  if (value == null) return '—';
  return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value));
}

function formatDate(value, language) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'es' ? 'es-US' : 'en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function generateEstimatePdf({ estimate, version, language = 'en' }) {
  const labels = copy[language] ?? copy.en;

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'LETTER', margin: 52, info: { Title: `${labels.estimate} ${estimate.number}` } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    document.font('Helvetica-Bold').fontSize(22)
      .text(`${version.businessNameSnapshot || 'Handy System'} — ${labels.estimate} PRE-${estimate.number}`);
    document.moveDown(1.2);
    document.font('Helvetica-Bold').fontSize(11).text(labels.recipient);
    document.font('Helvetica').fontSize(11).text(version.recipientNameSnapshot);
    document.moveDown(0.7);
    document.font('Helvetica-Bold').text(labels.property);
    document.font('Helvetica').text(version.propertyAddressSnapshot);
    document.moveDown(0.7);
    document.font('Helvetica-Bold').text(labels.scope);
    document.font('Helvetica').text(version.scopeSnapshot);
    document.moveDown(1);

    document.font('Helvetica-Bold').fontSize(10).text(labels.items);
    document.moveDown(0.4);
    for (const line of version.lines) {
      const description = `${line.description} (${labels.quantity}: ${line.quantity} × ${formatCurrency(line.unitPrice, language)})`;
      document.font('Helvetica').text(description, { width: 370, continued: true });
      document.text(formatCurrency(line.lineTotal, language), { align: 'right' });
      document.moveDown(0.35);
    }

    document.moveDown(0.7);
    document.font('Helvetica').fontSize(11);
    document.text(`${labels.subtotal}: ${formatCurrency(version.subtotal, language)}`, { align: 'right' });
    if (version.discountAmount && Number(version.discountAmount) > 0) {
      document.text(`${labels.discount}: −${formatCurrency(version.discountAmount, language)}`, { align: 'right' });
    }
    if (version.taxable) {
      document.text(`${labels.tax} (${version.taxRate}%): ${formatCurrency(version.taxAmount, language)}`, { align: 'right' });
    }
    document.font('Helvetica-Bold').fontSize(14)
      .text(`${labels.total}: ${formatCurrency(version.total, language)}`, { align: 'right' });
    document.moveDown(1);
    document.font('Helvetica').fontSize(9)
      .text(`${labels.expires}: ${formatDate(version.expiresAt, language)}`);
    document.end();
  });
}
