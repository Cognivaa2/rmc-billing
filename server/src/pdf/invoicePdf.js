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
  doc.rect(LEFT, y, W, 45).stroke();
  
  // Main Titles - Centered without logo/e-invoice boxes
  doc.font('Helvetica-Bold').fontSize(14).text('TAX INVOICE & DELIVERY CHALLAN', LEFT, y + 10, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(9).text('Original for Recipient', LEFT, y + 28, { width: W, align: 'center' });
  
  y += 45;

  // --- IRN / Ack Block ---
  doc.rect(LEFT, y, W, 40).stroke();
  doc.font('Helvetica').fontSize(8);
  doc.text(`IRN : ${invoice.irn || '4d5a6f72c0110994373cdd1bddb9e0645e66fbda3d74-825b04fd67089a9a37ef'}`, LEFT + 5, y + 5);
  doc.text(`Ack No : ${invoice.ackNo || '182519105144093'}`, LEFT + 5, y + 17);
  doc.text(`Ack Date : ${invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}`, LEFT + 5, y + 29);
  
  y += 40;

  // --- Supplier & Metadata Block ---
  const supplierH = 140;
  doc.rect(LEFT, y, W, supplierH).stroke();
  
  const leftW = W * 0.55;
  const rightW = W - leftW;

  // Left: Supplier
  doc.font('Helvetica-Bold').fontSize(8).text('SUPPLIER (YOUR COMPANY)', LEFT + 5, y + 5);
  doc.font('Helvetica-Bold').fontSize(10).text(company.companyName || 'COMPANY NAME', LEFT + 5, y + 16);
  doc.font('Helvetica').fontSize(8);
  doc.text(`Reg Address: ${company.regAddress || 'Punitata, India'}`, LEFT + 5, y + 32, { width: leftW - 15 });
  doc.text(`UDYAM Reg No. : ${company.udyamNo || 'UDYAM-WB-10-0009130 (Medium)'}`, LEFT + 5, y + 55);
  doc.text(`GSTIN Name: ${company.companyName}, Code : 14`, LEFT + 5, y + 68);
  doc.font('Helvetica-Bold').text(`GSTIN: ${company.gstin || ''}`, LEFT + 5, y + 81);
  doc.font('Helvetica').text(`E-mail : ${company.email || ''}`, LEFT + 5, y + 94);

  vLine(LEFT + leftW, y, y + supplierH);

  // Right: Metadata Grid
  const rowH = supplierH / 6;
  let gy = y;
  
  // Row 1
  cell('Invoice/Challan No:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell(invoice.invoiceNumber, LEFT + leftW, gy + 8, rightW * 0.6, rowH - 8, { border: false, bold: true, size: 8.5 });
  
  cell('Dated:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });
  cell(invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '', LEFT + leftW + rightW * 0.6, gy + 8, rightW * 0.4, rowH - 8, { border: false, bold: true, size: 8.5 });

  gy += rowH;
  // Row 2
  cell('Delivery Note:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell('Mode/Terms of Payment:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });

  gy += rowH;
  // Row 3
  cell('Reference No. & Date:', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell(invoice.invoiceNumber, LEFT + leftW, gy + 8, rightW * 0.6, rowH - 8, { border: false, bold: true, size: 8 });
  cell('Other References:', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });

  gy += rowH;
  // Row 4
  cell("Buyer's Order No.", LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell('Dated', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });

  gy += rowH;
  // Row 5
  cell('Dispatch Doc No.', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell(invoice.dispatch?.dispatchNumber || '', LEFT + leftW, gy + 8, rightW * 0.6, rowH - 8, { border: false, bold: true, size: 8 });
  cell('Delivery Note Date', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });

  gy += rowH;
  // Row 6
  cell('Dispatched through', LEFT + leftW, gy, rightW * 0.6, rowH, { size: 7 });
  cell('RAJARHAT PLANT', LEFT + leftW, gy + 8, rightW * 0.6, rowH - 8, { border: false, bold: true, size: 8 });
  cell('Destination', LEFT + leftW + rightW * 0.6, gy, rightW * 0.4, rowH, { size: 7 });
  cell('NEWTOWN', LEFT + leftW + rightW * 0.6, gy + 8, rightW * 0.4, rowH - 8, { border: false, bold: true, size: 8 });

  y += supplierH;

  // --- Consignee & Buyer Block ---
  const partyH = 80;
  doc.rect(LEFT, y, leftW, partyH).stroke();
  doc.font('Helvetica-Bold').fontSize(8).text('CONSIGNEE (SHIP-TO)', LEFT + 5, y + 5);
  doc.font('Helvetica-Bold').fontSize(9).text(invoice.client?.clientName || '', LEFT + 5, y + 15);
  doc.font('Helvetica').fontSize(8).text(`Site: ${invoice.dispatch?.site?.siteName || ''}`, LEFT + 5, y + 25);
  doc.text(`${invoice.dispatch?.site?.address || ''}`, LEFT + 5, y + 35, { width: leftW - 10 });
  doc.font('Helvetica-Bold').fontSize(8).text(`GSTIN/ UIN : ${invoice.client?.gstin || ''}`, LEFT + 5, y + partyH - 15);

  y += partyH;
  doc.rect(LEFT, y, leftW, partyH + 15).stroke();
  doc.font('Helvetica-Bold').fontSize(8).text('BUYER (BILL-TO)', LEFT + 5, y + 5);
  doc.font('Helvetica-Bold').fontSize(9).text(invoice.client?.clientName || '', LEFT + 5, y + 15);
  doc.font('Helvetica').fontSize(8).text(invoice.client?.officeAddress || '', LEFT + 5, y + 25, { width: leftW - 10 });
  doc.text(`Phone: ${invoice.client?.phone || ''}`, LEFT + 5, y + 45);
  doc.font('Helvetica-Bold').fontSize(8).text(`GSTIN/ UIN : ${invoice.client?.gstin || ''}`, LEFT + 5, y + partyH + 15 - 30);
  doc.font('Helvetica-Bold').fontSize(8).text(`Place of Supply : West Bengal`, LEFT + 5, y + partyH + 15 - 15);

  // Right side of party info: Terms of Delivery
  doc.rect(LEFT + leftW, y - partyH, rightW, partyH + partyH + 15).stroke();
  doc.font('Helvetica').fontSize(8).text('Terms of Delivery', LEFT + leftW + 5, y - partyH + 5);
  
  let dy = y - partyH + 25;
  doc.font('Helvetica-Bold').fontSize(7.5).text('Dispatched through (e.g., PLANT)', LEFT + leftW + 5, dy);
  doc.text('Destination (e.g., NEWTOWN SITE)', LEFT + leftW + 5, dy + 12);
  doc.text(`Vehicle No: ${invoice.dispatch?.vehicleNumber || ''}`, LEFT + leftW + 5, dy + 24);

  dy += 50;
  line(dy, LEFT + leftW, RIGHT);
  cell('Time In', LEFT + leftW, dy, rightW / 2, 20, { size: 7 });
  cell('', LEFT + leftW + rightW / 2, dy, rightW / 2, 20, { size: 7 });
  
  dy += 20;
  line(dy, LEFT + leftW, RIGHT);
  cell('Time out', LEFT + leftW, dy, rightW / 2, 20, { size: 7 });
  cell('', LEFT + leftW + rightW / 2, dy, rightW / 2, 20, { size: 7 });

  y += partyH + 15;

  // --- Items Table ---
  const cols = [
    { label: '# No', w: 30 },
    { label: 'Description of Goods', w: 0 },
    { label: 'HSN/SAC Code', w: 70 },
    { label: 'Unit', w: 40 },
    { label: 'Quantity', w: 60 },
    { label: 'Rate per Unit', w: 70 },
    { label: 'Amount', w: 80 }
  ];
  const usedW = cols.reduce((acc, c) => acc + c.w, 0);
  cols[1].w = W - usedW;

  let tx = LEFT;
  cols.forEach(c => {
    cell(c.label, tx, y, c.w, 20, { bold: true, align: 'center', valign: 'center', size: 7.5 });
    tx += c.w;
  });
  y += 20;

  const itemH = 60;
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
  const subH = 15;
  const cgst = invoice.amount * 0.09;
  const sgst = invoice.amount * 0.09;
  const subtotal = invoice.amount + cgst + sgst;
  const roundedTotal = Math.round(subtotal);
  const roundOff = roundedTotal - subtotal;

  cell('Output CGST', LEFT, y, totalLabelW, subH, { align: 'right', size: 7.5 });
  cell(cgst.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7.5 });
  y += subH;
  cell('Output SGST', LEFT, y, totalLabelW, subH, { align: 'right', size: 7.5 });
  cell(sgst.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7.5 });
  y += subH;
  cell('Round Off', LEFT, y, totalLabelW, subH, { align: 'right', size: 7.5 });
  cell(roundOff.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { align: 'right', size: 7.5 });
  y += subH;

  cell('Total', LEFT, y, totalLabelW - cols[4].w - cols[5].w, subH, { bold: true, align: 'right', bg: '#f2f2f2' });
  cell(invoice.quantity.toFixed(2), LEFT + (totalLabelW - cols[4].w - cols[5].w), y, cols[4].w, subH, { bold: true, align: 'center', bg: '#f2f2f2' });
  cell('', LEFT + (totalLabelW - cols[5].w), y, cols[5].w, subH, { bg: '#f2f2f2' });
  cell(roundedTotal.toFixed(2), LEFT + totalLabelW, y, cols[6].w, subH, { bold: true, align: 'right', bg: '#f2f2f2' });
  y += subH + 10;

  // --- Tax Summary ---
  const taxCols = [
    { label: 'HSN/SAC', w: 80 },
    { label: 'Taxable Value', w: 100 },
    { label: 'Output CGST (Rate/Amount)', w: 120 },
    { label: 'Output SGST (Rate/Amount)', w: 120 },
    { label: 'Total Tax Amount', w: W - 420 }
  ];
  tx = LEFT;
  taxCols.forEach(c => {
    cell(c.label, tx, y, c.w, 20, { bold: true, align: 'center', valign: 'center', size: 7 });
    tx += c.w;
  });
  y += 20;
  tx = LEFT;
  cell(invoice.grade?.hsnCode || '38245010', tx, y, taxCols[0].w, 20, { align: 'center' }); tx += taxCols[0].w;
  cell(invoice.amount.toFixed(2), tx, y, taxCols[1].w, 20, { align: 'center' }); tx += taxCols[1].w;
  cell(`9%  ${cgst.toFixed(2)}`, tx, y, taxCols[2].w, 20, { align: 'center' }); tx += taxCols[2].w;
  cell(`9%  ${sgst.toFixed(2)}`, tx, y, taxCols[3].w, 20, { align: 'center' }); tx += taxCols[3].w;
  cell((cgst + sgst).toFixed(2), tx, y, taxCols[4].w, 20, { align: 'center' }); tx += taxCols[4].w;
  y += 20 + 5;

  // --- Words Section ---
  cell('Amount Chargeable (in words):', LEFT, y, W, 15, { bold: true, border: false });
  doc.font('Helvetica').fontSize(8).text(numberToWords(roundedTotal), LEFT + 5, y + 12);
  y += 25;
  cell('Tax Amount (in words):', LEFT, y, W, 15, { bold: true, border: false });
  doc.font('Helvetica').fontSize(8).text(numberToWords(cgst + sgst), LEFT + 5, y + 12);
  y += 25;

  // --- Declaration & Terms ---
  doc.rect(LEFT, y, W, 90).stroke();
  doc.font('Helvetica-Bold').fontSize(8).text('Declaration:', LEFT + 5, y + 5);
  doc.font('Helvetica').fontSize(7.5).text('We declare that this invoice show the actual price of the goods described and that all particulars are true and correct.', LEFT + 5, y + 15, { width: W * 0.45 });
  doc.text(`Company's PAN : ${company.pan || ''}`, LEFT + 5, y + 35);

  const tcY = y + 50;
  doc.font('Helvetica-Bold').fontSize(8).text('Terms & Conditions:', LEFT + 5, tcY);
  doc.font('Helvetica').fontSize(7).text('• Goods once sold will not be taken back.', LEFT + 5, tcY + 10);
  doc.text('• Interest @ 18% p.a. will be charged if payment is not made within due date.', LEFT + 5, tcY + 18);
  doc.text('• Subject to local jurisdiction.', LEFT + 5, tcY + 26);

  vLine(LEFT + W * 0.5, y, y + 90);
  doc.font('Helvetica-Bold').fontSize(8).text(`for ${company.companyName || 'YOUR COMPANY NAME'}`, RIGHT - 180, y + 65, { width: 170, align: 'right' });
  doc.text('(Authorized Signatory)', RIGHT - 180, y + 75, { width: 170, align: 'right' });

  // --- Footer Details ---
  y += 95;
  const footH = 40;
  doc.rect(LEFT, y, W * 0.33, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(7).text('Dispatch Details', LEFT + 5, y + 5);
  doc.font('Helvetica').fontSize(7).text('Dispatch approved by: ________________', LEFT + 5, y + 15);
  doc.text('Challan generated by: ________________', LEFT + 5, y + 25);

  doc.rect(LEFT + W * 0.33, y, W * 0.33, footH).stroke();
  doc.rect(LEFT + W * 0.66, y, W * 0.34, footH).stroke();
  doc.font('Helvetica-Bold').fontSize(7).text('Receipt Details', LEFT + W * 0.66 + 5, y + 5);
  doc.font('Helvetica').fontSize(7).text('Received by: ________________________', LEFT + W * 0.66 + 5, y + 15);
  doc.text('Name / Designation: __________________', LEFT + W * 0.66 + 5, y + 25);

  doc.font('Helvetica-Oblique').fontSize(7).text('This is a computer generated document and does not require a signature', LEFT, doc.page.height - 30, { width: W, align: 'center' });

  doc.end();
}
