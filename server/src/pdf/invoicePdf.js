import PDFDocument from 'pdfkit';

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

  // --- IRN / Ack Block ---
  doc.rect(LEFT, y, W, 35).stroke();
  doc.font('Helvetica').fontSize(7.5);
  doc.text(`IRN : ${invoice.irn || '4d5a6f72c0110994373cdd1bddb9e0645e66fbda3d74-825b04fd67089a9a37ef'}`, LEFT + 5, y + 4);
  doc.text(`Ack No : ${invoice.ackNo || '182519105144093'}`, LEFT + 5, y + 14);
  doc.text(`Ack Date : ${invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}`, LEFT + 5, y + 24);
  y += 35;

  // --- Supplier & Metadata Block ---
  const supplierH = 125;
  doc.rect(LEFT, y, W, supplierH).stroke();

  const leftW = W * 0.55;
  const rightW = W - leftW;

  // Left: Supplier
  doc.font('Helvetica-Bold').fontSize(8).text('SUPPLIER (YOUR COMPANY)', LEFT + 5, y + 4);
  doc.font('Helvetica-Bold').fontSize(10).text(company.companyName || 'COMPANY NAME', LEFT + 5, y + 14);
  doc.font('Helvetica').fontSize(7.5);
  doc.text(`Reg Address: ${company.regAddress || 'Punitata, India'}`, LEFT + 5, y + 28, { width: leftW - 15 });
  doc.text(`UDYAM Reg No. : ${company.udyamNo || 'UDYAM-WB-10-0009130 (Medium)'}`, LEFT + 5, y + 50);
  doc.text(`GSTIN Name: ${company.companyName}, Code : 14`, LEFT + 5, y + 62);
  doc.font('Helvetica-Bold').text(`GSTIN: ${company.gstin || ''}`, LEFT + 5, y + 74);
  doc.font('Helvetica').text(`E-mail : ${company.email || ''}`, LEFT + 5, y + 86);

  vLine(LEFT + leftW, y, y + supplierH);

  // Right: Metadata Grid
  const rowH = supplierH / 6;
  let gy = y;

  cell('Invoice/Challan No:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell(invoice.invoiceNumber, LEFT + leftW, gy + 7, rightW * 0.6, rowH - 7, { border: false, bold: true, size: 8 });
  cell('Dated:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });
  cell(invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '', LEFT + leftW + rightW * 0.6, gy + 7, rightW * 0.4, rowH - 7, { border: false, bold: true, size: 8 });

  gy += rowH;
  cell('Delivery Note:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell('Mode/Terms of Payment:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });

  gy += rowH;
  cell('Reference No. & Date:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell(invoice.invoiceNumber, LEFT + leftW, gy + 7, rightW * 0.6, rowH - 7, { border: false, bold: true, size: 7.5 });
  cell('Other References:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });

  gy += rowH;
  cell("Buyer's Order No.", LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell('Dated', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });

  gy += rowH;
  cell('Dispatch Doc No.', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell(invoice.dispatch?.dispatchNumber || '', LEFT + leftW, gy + 7, rightW * 0.6, rowH - 7, { border: false, bold: true, size: 7.5 });
  cell('Delivery Note Date', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });

  gy += rowH;
  cell('Dispatched through', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 6.5 });
  cell('RAJARHAT PLANT', LEFT + leftW, gy + 7, rightW * 0.6, rowH - 7, { border: false, bold: true, size: 7.5 });
  cell('Destination', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 6.5 });
  cell('NEWTOWN', LEFT + leftW + rightW * 0.6, gy + 7, rightW * 0.4, rowH - 7, { border: false, bold: true, size: 7.5 });

  y += supplierH;

  // --- Consignee & Buyer Block ---
  const partyH = 70;
  doc.rect(LEFT, y, leftW, partyH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('CONSIGNEE (SHIP-TO)', LEFT + 5, y + 4);
  doc.font('Helvetica-Bold').fontSize(8.5).text(invoice.client?.clientName || '', LEFT + 5, y + 14);
  doc.font('Helvetica').fontSize(7.5).text(`Site: ${invoice.dispatch?.site?.siteName || ''}`, LEFT + 5, y + 23);
  doc.text(`${invoice.dispatch?.site?.address || ''}`, LEFT + 5, y + 32, { width: leftW - 10 });
  doc.font('Helvetica-Bold').fontSize(7.5).text(`GSTIN/ UIN : ${invoice.client?.gstin || ''}`, LEFT + 5, y + partyH - 12);

  y += partyH;
  const buyerH = 80;
  doc.rect(LEFT, y, leftW, buyerH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('BUYER (BILL-TO)', LEFT + 5, y + 4);
  doc.font('Helvetica-Bold').fontSize(8.5).text(invoice.client?.clientName || '', LEFT + 5, y + 14);
  doc.font('Helvetica').fontSize(7.5).text(invoice.client?.officeAddress || '', LEFT + 5, y + 23, { width: leftW - 10 });
  doc.text(`Phone: ${invoice.client?.phone || ''}`, LEFT + 5, y + 40);
  doc.font('Helvetica-Bold').fontSize(7.5).text(`GSTIN/ UIN : ${invoice.client?.gstin || ''}`, LEFT + 5, y + buyerH - 22);
  doc.font('Helvetica-Bold').fontSize(7.5).text(`Place of Supply : West Bengal`, LEFT + 5, y + buyerH - 10);

  // Right side of party info: Terms of Delivery
  doc.rect(LEFT + leftW, y - partyH, rightW, partyH + buyerH).stroke();
  doc.font('Helvetica').fontSize(7.5).text('Terms of Delivery', LEFT + leftW + 5, y - partyH + 4);

  let dy = y - partyH + 20;
  doc.font('Helvetica-Bold').fontSize(7).text('Dispatched through (e.g., PLANT)', LEFT + leftW + 5, dy);
  doc.text('Destination (e.g., NEWTOWN SITE)', LEFT + leftW + 5, dy + 10);
  doc.text(`Vehicle No: ${invoice.dispatch?.vehicleNumber || ''}`, LEFT + leftW + 5, dy + 20);

  dy += 40;
  line(dy, LEFT + leftW, RIGHT);
  cell('Time In', LEFT + leftW, dy, rightW / 2, 18, { size: 6.5 });
  cell('', LEFT + leftW + rightW / 2, dy, rightW / 2, 18, { size: 6.5 });

  dy += 18;
  line(dy, LEFT + leftW, RIGHT);
  cell('Time out', LEFT + leftW, dy, rightW / 2, 18, { size: 6.5 });
  cell('', LEFT + leftW + rightW / 2, dy, rightW / 2, 18, { size: 6.5 });

  y += buyerH;

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
  cell(invoice.grade?.gradeCode || 'Ready Mix Concrete', tx, y, cols[1].w, itemH); tx += cols[1].w;
  cell(invoice.grade?.hsnCode || '38245010', tx, y, cols[2].w, itemH, { align: 'center' }); tx += cols[2].w;
  cell('M³', tx, y, cols[3].w, itemH, { align: 'center' }); tx += cols[3].w;
  cell(invoice.quantity.toFixed(2), tx, y, cols[4].w, itemH, { align: 'center' }); tx += cols[4].w;
  cell(invoice.rate.toFixed(2), tx, y, cols[5].w, itemH, { align: 'center' }); tx += cols[5].w;
  cell(invoice.amount.toFixed(2), tx, y, cols[6].w, itemH, { align: 'right' }); tx += cols[6].w;
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
  cell(cgst.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;
  cell('Output SGST', LEFT, y, totalLabelW, subH, { align: 'right', size: 7 });
  cell(sgst.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;
  cell('Round Off', LEFT, y, totalLabelW, subH, { align: 'right', size: 7 });
  cell(roundOff.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7 });
  y += subH;

  cell('Total', LEFT, y, totalLabelW - cols[4].w - cols[5].w, subH, { bold: true, align: 'right', bg: '#f2f2f2', size: 7.5 });
  cell(invoice.quantity.toFixed(2), LEFT + (totalLabelW - cols[4].w - cols[5].w), y, cols[4].w, subH, { bold: true, align: 'center', bg: '#f2f2f2', size: 7.5 });
  cell('', LEFT + (totalLabelW - cols[5].w), y, cols[5].w, subH, { bg: '#f2f2f2' });
  cell(roundedTotal.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { bold: true, align: 'right', bg: '#f2f2f2', size: 7.5 });
  y += subH + 8;

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

  // --- Declaration & Terms ---
  const declH = 75;
  doc.rect(LEFT, y, W, declH).stroke();
  doc.font('Helvetica-Bold').fontSize(7.5).text('Declaration:', LEFT + 5, y + 4);
  doc.font('Helvetica').fontSize(7).text('We declare that this invoice show the actual price of the goods described and that all particulars are true and correct.', LEFT + 5, y + 12, { width: W * 0.45 });
  doc.text(`Company's PAN : ${company.pan || ''}`, LEFT + 5, y + 30);

  const tcY = y + 42;
  doc.font('Helvetica-Bold').fontSize(7.5).text('Terms & Conditions:', LEFT + 5, tcY);
  doc.font('Helvetica').fontSize(6.5).text('• Goods once sold will not be taken back.', LEFT + 5, tcY + 9);
  doc.text('• Interest @ 18% p.a. will be charged if payment is not made within due date.', LEFT + 5, tcY + 16);
  doc.text('• Subject to local jurisdiction.', LEFT + 5, tcY + 23);

  vLine(LEFT + W * 0.5, y, y + declH);
  doc.font('Helvetica-Bold').fontSize(7.5).text(`for ${company.companyName || 'YOUR COMPANY NAME'}`, RIGHT - 180, y + 55, { width: 170, align: 'right' });
  doc.text('(Authorized Signatory)', RIGHT - 180, y + 64, { width: 170, align: 'right' });

  // --- Footer Details ---
  y += declH + 10;
  const footH = 35;
  doc.rect(LEFT, y, W * 0.33, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(6.5).text('Dispatch Details', LEFT + 5, y + 4);
  doc.font('Helvetica').fontSize(6.5).text('Dispatch approved by: ________________', LEFT + 5, y + 12);
  doc.text('Challan generated by: ________________', LEFT + 5, y + 20);

  doc.rect(LEFT + W * 0.33, y, W * 0.33, footH).stroke();
  doc.rect(LEFT + W * 0.66, y, W * 0.34, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(6.5).text('Receipt Details', LEFT + W * 0.66 + 5, y + 4);
  doc.font('Helvetica').fontSize(6.5).text('Received by: ________________________', LEFT + W * 0.66 + 5, y + 12);
  doc.text('Name / Designation: __________________', LEFT + W * 0.66 + 5, y + 20);

  doc.font('Helvetica-Oblique').fontSize(6.5).text('This is a computer generated document and does not require a signature', LEFT, y + footH + 10, { width: W, align: 'center' });

  doc.end();
}
