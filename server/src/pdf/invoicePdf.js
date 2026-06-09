import PDFDocument from 'pdfkit';

function getInitials(name) {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Renders an Invoice / Delivery Challan PDF matching the user's physical format.
 * 
 * Layout based on the provided "TAX INVOICE & DELIVERY CHALLAN" template.
 * 
 * @param {import('stream').Writable} stream
 * @param {{ invoice, company }} ctx
 */
export function renderInvoicePdf(stream, { invoice, company }) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 20, bottom: 20, left: 20, right: 20 },
  });
  doc.pipe(stream);

  // When invoice was created directly from order (no dispatch), fall back to order fields
  const site = invoice.dispatch?.site || invoice.order?.site;
  const vehicleNumber = invoice.vehicleNumber || invoice.dispatch?.vehicleNumber || '';
  const dispatchNumber = invoice.dispatch?.dispatchNumber || invoice.order?.orderNumber || '';

  const W = doc.page.width - 40;
  const LEFT = 20;
  const RIGHT = doc.page.width - 20;

  // --- Helpers ---
  const line = (y, x1 = LEFT, x2 = RIGHT) =>
    doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#000').lineWidth(0.5).stroke();

  const vLine = (x, y1, y2) =>
    doc.moveTo(x, y1).lineTo(x, y2).strokeColor('#000').lineWidth(0.5).stroke();

  const cell = (text, x, y, w, h, opts = {}) => {
    const {
      bold = false,
      size = 7.5,
      align = 'left',
      bg = null,
      valign = 'top',
      border = true,
      padding = 4
    } = opts;

    if (bg) {
      doc.rect(x, y, w, h).fillColor(bg).fill();
    }
    if (border) {
      doc.rect(x, y, w, h).strokeColor('#000').lineWidth(0.5).stroke();
    }

    doc.fillColor('#000').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);

    let textY = y + padding;
    if (valign === 'center') {
      const textHeight = doc.heightOfString(String(text ?? ''), { width: w - (padding * 2) });
      textY = y + (h - textHeight) / 2;
    }

    doc.text(String(text ?? ''), x + padding, textY, {
      width: w - (padding * 2),
      align,
    });
  };

  const numberToWords = (amount) => {
    const words = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertGroup(n) {
      let res = '';
      if (n >= 100) {
        res += words[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        res += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        res += words[n] + ' ';
      }
      return res;
    }

    if (amount === 0) return 'INR Zero Only';

    let str = '';
    let temp = Math.floor(amount);

    // Crore
    if (temp >= 10000000) {
      str += convertGroup(Math.floor(temp / 10000000)) + 'Crore ';
      temp %= 10000000;
    }
    // Lakh
    if (temp >= 100000) {
      str += convertGroup(Math.floor(temp / 100000)) + 'Lakh ';
      temp %= 100000;
    }
    // Thousand
    if (temp >= 1000) {
      str += convertGroup(Math.floor(temp / 1000)) + 'Thousand ';
      temp %= 1000;
    }
    // Hundreds
    if (temp > 0) {
      str += convertGroup(temp);
    }

    const paise = Math.round((amount - Math.floor(amount)) * 100);
    if (paise > 0) {
      str += 'and ' + convertGroup(paise) + 'Paise ';
    }

    return 'INR ' + str.trim() + ' Only';
  };

  let y = 20;

  // --- Header Block ---
  doc.rect(LEFT, y, W, 40).stroke();
  doc.font('Helvetica-Bold').fontSize(14).text('TAX INVOICE & DELIVERY CHALLAN', LEFT, y + 8, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(8.5).text('Original for Recipient', LEFT, y + 25, { width: W, align: 'center' });
  y += 40;

  // --- Metadata Grid Block (Supplier info and IRN removed, full width grid) ---
  const gridH = 40;
  const col1W = W * 0.6;
  const col2W = W * 0.4;
  const rH = 20;

  doc.rect(LEFT, y, W, gridH).stroke();
  vLine(LEFT + col1W, y, y + rH); // only draw vertical line for Row 1
  line(y + rH, LEFT, RIGHT);

  // Row 1
  let cy = y;
  cell('Invoice/Challan No:', LEFT, cy, col1W, rH, { border: false, size: 6.5 });
  cell(invoice.invoiceNumber, LEFT, cy + 7, col1W, rH - 7, { border: false, bold: true, size: 8 });
  cell('Dated:', LEFT + col1W, cy, col2W, rH, { border: false, size: 6.5 });
  cell(invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '', LEFT + col1W, cy + 7, col2W, rH - 7, { border: false, bold: true, size: 8 });

  // Row 2
  cy += rH;
  cell('Dispatch Doc No.', LEFT, cy, col1W, rH, { border: false, size: 6.5 });
  cell(dispatchNumber, LEFT, cy + 7, col1W, rH - 7, { border: false, bold: true, size: 7.5 });
  cell('Vehicle No:', LEFT + col1W, cy, col2W, rH, { border: false, size: 6.5 });
  cell(vehicleNumber, LEFT + col1W, cy + 7, col2W, rH - 7, { border: false, bold: true, size: 7.5 });

  y += gridH;

  // --- Consignee & Buyer Block ---
  const halfW = W / 2;
  const blockH = 95;

  // Consignee (Left)
  doc.rect(LEFT, y, halfW, blockH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('CONSIGNEE (SHIP-TO)', LEFT + 5, y + 4);
  doc.font('Helvetica-Bold').fontSize(8.5).text(invoice.client?.clientName || '', LEFT + 5, y + 14);
  doc.font('Helvetica').fontSize(7.5).text(`Site: ${site?.siteName || ''}`, LEFT + 5, y + 23);
  doc.text(`Site Address: ${site?.siteAddress || site?.address || ''}`, LEFT + 5, y + 32, { width: halfW - 10 });


  // Buyer (Right)
  const rightX = LEFT + halfW;
  doc.rect(rightX, y, halfW, blockH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('BUYER (BILL-TO)', rightX + 5, y + 4);
  doc.font('Helvetica-Bold').fontSize(8.5).text(invoice.client?.clientName || '', rightX + 5, y + 14);
  doc.font('Helvetica').fontSize(7.5).text(invoice.client?.officeAddress || '', rightX + 5, y + 23, { width: halfW - 10 });
  doc.text(`Phone: ${invoice.client?.contactNumber || ''}`, rightX + 5, y + 55);
  doc.font('Helvetica-Bold').fontSize(7.5).text(`GSTIN/ UIN : ${invoice.client?.taxInformation?.gstin || ''}`, rightX + 5, y + blockH - 12);

  y += blockH;

  // --- Items Table ---
  const cols = [
    { label: '# No', w: 25 },
    { label: 'Description of Goods', w: 0 },
    { label: 'HSN/SAC Code', w: 65 },
    { label: 'Unit', w: 35 },
    { label: 'Quantity', w: 55 },
    { label: 'Rate per Unit', w: 65 },
    { label: 'Amount', w: 75 }
  ];
  const usedW = cols.reduce((acc, c) => acc + c.w, 0);
  cols[1].w = W - usedW;

  let tx = LEFT;
  cols.forEach(c => {
    cell(c.label, tx, y, c.w, 18, { bold: true, align: 'center', valign: 'center', size: 7 });
    tx += c.w;
  });
  y += 18;

  const itemH = 45;
  tx = LEFT;
  cell('1', tx, y, cols[0].w, itemH, { align: 'center' }); tx += cols[0].w;
  cell(invoice.grade?.gradeCode || invoice.gradeLabel || 'Ready Mix Concrete', tx, y, cols[1].w, itemH); tx += cols[1].w;
  cell(invoice.grade?.hsnCode || '38245010', tx, y, cols[2].w, itemH, { align: 'center' }); tx += cols[2].w;
  cell('M³', tx, y, cols[3].w, itemH, { align: 'center' }); tx += cols[3].w;
  cell(invoice.quantity.toFixed(2), tx, y, cols[4].w, itemH, { align: 'center' }); tx += cols[4].w;
  cell(invoice.showRateOnInvoice ? invoice.rate.toFixed(2) : '—', tx, y, cols[5].w, itemH, { align: 'center' }); tx += cols[5].w;
  cell(invoice.showRateOnInvoice ? invoice.amount.toFixed(2) : '—', tx, y, cols[6].w, itemH, { align: 'right' }); tx += cols[6].w;
  y += itemH;

  // Table Totals
  const totalLabelW = W - cols[6].w;
  const subH = 14;
  const cgst = invoice.amount * 0.09;
  const sgst = invoice.amount * 0.09;
  const subtotal = invoice.amount + cgst + sgst;
  const roundedTotal = Math.round(subtotal);
  const roundOff = roundedTotal - subtotal;

  cell('Output CGST', LEFT, y, totalLabelW, subH, { align: 'right', size: 7 });
  cell(invoice.showRateOnInvoice ? cgst.toFixed(2) : '—', LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;
  cell('Output SGST', LEFT, y, totalLabelW, subH, { align: 'right', size: 7 });
  cell(invoice.showRateOnInvoice ? sgst.toFixed(2) : '—', LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;
  cell('Round Off', LEFT, y, totalLabelW, subH, { align: 'right', size: 7 });
  cell(invoice.showRateOnInvoice ? roundOff.toFixed(2) : '—', LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;

  cell('Total', LEFT, y, totalLabelW - cols[4].w - cols[5].w, subH, { bold: true, align: 'right', bg: '#f2f2f2', size: 7.5 });
  cell(invoice.quantity.toFixed(2), LEFT + (totalLabelW - cols[4].w - cols[5].w), y, cols[4].w, subH, { bold: true, align: 'center', bg: '#f2f2f2', size: 7.5 });
  cell('', LEFT + (totalLabelW - cols[5].w), y, cols[5].w, subH, { bg: '#f2f2f2' });
  cell(invoice.showRateOnInvoice ? roundedTotal.toFixed(2) : '—', LEFT + totalLabelW, y, cols[6].w, subH, { bold: true, align: 'right', bg: '#f2f2f2', size: 7.5 });
  y += subH + 8;

  if (invoice.showRateOnInvoice) {
    // --- Tax Summary ---
    const taxCols = [
      { label: 'HSN/SAC', w: 70 },
      { label: 'Taxable Value', w: 80 },
      { label: 'Output CGST', w: 100 },
      { label: 'Output SGST', w: 100 },
      { label: 'Total Tax', w: W - 350 }
    ];
    tx = LEFT;
    taxCols.forEach(c => {
      cell(c.label, tx, y, c.w, 18, { bold: true, align: 'center', valign: 'center', size: 6.5 });
      tx += c.w;
    });
    y += 18;
    tx = LEFT;
    cell(invoice.grade?.hsnCode || '38245010', tx, y, taxCols[0].w, 15, { align: 'center', size: 6.5 }); tx += taxCols[0].w;
    cell(invoice.amount.toFixed(2), tx, y, taxCols[1].w, 15, { align: 'center', size: 6.5 }); tx += taxCols[1].w;
    cell(`9% ${cgst.toFixed(2)}`, tx, y, taxCols[2].w, 15, { align: 'center', size: 6.5 }); tx += taxCols[2].w;
    cell(`9% ${sgst.toFixed(2)}`, tx, y, taxCols[3].w, 15, { align: 'center', size: 6.5 }); tx += taxCols[3].w;
    cell((cgst + sgst).toFixed(2), tx, y, taxCols[4].w, 15, { align: 'center', size: 6.5 }); tx += taxCols[4].w;
    y += 15 + 5;

    // --- Words Section ---
    cell('Amount Chargeable (in words):', LEFT, y, W, 12, { bold: true, border: false, size: 7 });
    doc.font('Helvetica').fontSize(7.5).text(numberToWords(roundedTotal), LEFT + 5, y + 11);
    y += 22;
    cell('Tax Amount (in words):', LEFT, y, W, 12, { bold: true, border: false, size: 7 });
    doc.font('Helvetica').fontSize(7.5).text(numberToWords(cgst + sgst), LEFT + 5, y + 11);
    y += 22;
  }

  // --- Declaration & Terms ---
  const declH = 75;
  doc.rect(LEFT, y, W, declH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('Declaration:', LEFT + 5, y + 4);
  doc.font('Helvetica').fontSize(7).text('We declare that this invoice show the actual price of the goods described and that all particulars are true and correct.', LEFT + 5, y + 12, { width: W * 0.7 });

  const tcY = y + 42;
  doc.font('Helvetica-Bold').fontSize(7.5).text('Terms & Conditions:', LEFT + 5, tcY);
  doc.font('Helvetica').fontSize(6.5).text('• Goods once sold will not be taken back.', LEFT + 5, tcY + 9);
  doc.text('• Interest @ 18% p.a. will be charged if payment is not made within due date.', LEFT + 5, tcY + 16);
  doc.text('• Subject to local jurisdiction.', LEFT + 5, tcY + 23);

  doc.text('(Authorized Signatory)', RIGHT - 180, y + 64, { width: 170, align: 'right' });

  // --- Footer Details ---
  y += declH + 10;
  const footH = 35;
  doc.rect(LEFT, y, W * 0.5, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(6.5).text('Dispatch Details', LEFT + 5, y + 4);

  const l2User = invoice.order?.saleAuthorizedByLevel2 || invoice.order?.approvedByLevel2;
  const dispatchApprovedBy = l2User?.name ? getInitials(l2User.name) : '';
  const challanGeneratedBy = invoice.generatedByLevel4?.name ? getInitials(invoice.generatedByLevel4.name) : '';

  doc.font('Helvetica').fontSize(6.5).text(`Dispatch approved by: ${dispatchApprovedBy || '________________'}`, LEFT + 5, y + 12);
  doc.text(`Challan generated by: ${challanGeneratedBy || '________________'}`, LEFT + 5, y + 20);

  doc.rect(LEFT + W * 0.5, y, W * 0.5, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(6.5).text('Receipt Details', LEFT + W * 0.5 + 5, y + 4);
  doc.font('Helvetica').fontSize(6.5).text('Received by: ________________________', LEFT + W * 0.5 + 5, y + 12);
  doc.text('Name / Designation: __________________', LEFT + W * 0.5 + 5, y + 20);

  doc.font('Helvetica-Oblique').fontSize(6.5).text('This is a computer generated document and does not require a signature', LEFT, y + footH + 10, { width: W, align: 'center' });

  doc.end();
}
