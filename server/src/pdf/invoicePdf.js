import PDFDocument from 'pdfkit';

/**
 * Renders an Invoice / Delivery Challan PDF matching the user's physical format.
 * 
 * Layout:
 * - Header: Challan No, Date
 * - Center Header: Company Name, Address, GSTIN, Dispatch Address
 * - Title: DELIVERY CHALLAN
 * - Blocks: Bill to, Ship to
 * - Row: Dispatch Date & Time, Vehicle No
 * - Table: Sl. No, ITEM NAME, HSN CODE, UNIT, QUANTITY, RATE, AMOUNT
 * - Footer: Terms & Conditions, Signatures
 * 
 * @param {import('stream').Writable} stream
 * @param {{ invoice, company }} ctx
 */
export function renderInvoicePdf(stream, { invoice, company }) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
  });
  doc.pipe(stream);

  const W = doc.page.width - 60;
  const LEFT = 30;
  const RIGHT = doc.page.width - 30;
  
  // Helpers
  const line = (y, x1 = LEFT, x2 = RIGHT) =>
    doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#000').lineWidth(0.5).stroke();

  const vLine = (x, y1, y2) =>
    doc.moveTo(x, y1).lineTo(x, y2).strokeColor('#000').lineWidth(0.5).stroke();

  const cell = (text, x, y, w, h, opts = {}) => {
    const { bold = false, size = 9, align = 'left', bg = null, valign = 'top' } = opts;
    if (bg) {
      doc.rect(x, y, w, h).fillColor(bg).fill();
    }
    doc.rect(x, y, w, h).strokeColor('#000').lineWidth(0.5).stroke();
    
    doc.fillColor('#000').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    
    let textY = y + 5;
    if (valign === 'center') {
      const textHeight = doc.heightOfString(String(text ?? ''), { width: w - 10 });
      textY = y + (h - textHeight) / 2;
    }

    doc.text(String(text ?? ''), x + 5, textY, {
      width: w - 10,
      align,
    });
  };

  let y = 30;

  // Outer border
  doc.rect(LEFT, y, W, doc.page.height - 60).stroke();

  // Header row: Challan No and Date
  doc.font('Helvetica').fontSize(10);
  doc.text(`Challan No: ${invoice.invoiceNumber || ''}`, LEFT + 10, y + 10);
  doc.text(`Date: ${invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString('en-IN') : ''}`, RIGHT - 150, y + 10, { align: 'right', width: 140 });
  y += 30;
  line(y);

  // Company Details
  doc.font('Helvetica-Bold').fontSize(12).text(company.companyName || 'COMPANY NAME', LEFT, y + 10, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Reg Address: ${company.regAddress || ''}`, LEFT, y + 25, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`GSTIN: ${company.gstin || ''}`, LEFT, y + 35, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(9).text(`Dispatch Address: ${company.dispatchAddress || ''}`, LEFT, y + 45, { width: W, align: 'center' });
  y += 65;
  line(y);

  // Title: DELIVERY CHALLAN
  doc.font('Helvetica-Bold').fontSize(14).text('DELIVERY CHALLAN', LEFT, y + 5, { width: W, align: 'center' });
  y += 25;
  line(y);

  // Bill to / Ship to
  const addrHeight = 120;
  // Bill to
  doc.font('Helvetica-Bold').fontSize(10).text('Bill to:', LEFT + 10, y + 10);
  doc.font('Helvetica').fontSize(10).text(invoice.client?.clientName || '', LEFT + 10, y + 25);
  doc.font('Helvetica').fontSize(9).text(invoice.client?.officeAddress || '', LEFT + 10, y + 40, { width: W/2 - 20 });
  
  vLine(LEFT + W/2, y, y + addrHeight);
  
  // Ship to
  doc.font('Helvetica-Bold').fontSize(10).text('Ship to:', LEFT + W/2 + 10, y + 10);
  doc.font('Helvetica').fontSize(10).text(invoice.client?.clientName || '', LEFT + W/2 + 10, y + 25);
  const siteAddress = invoice.dispatch?.site?.address || invoice.dispatch?.site?.siteName || '';
  doc.font('Helvetica').fontSize(9).text(siteAddress, LEFT + W/2 + 10, y + 40, { width: W/2 - 20 });

  y += addrHeight;
  line(y);

  // Dispatch details
  const dispatchDateTime = invoice.dispatch?.dispatchDateTime || invoice.generatedAt;
  doc.font('Helvetica').fontSize(10).text(`Dispatch Date & Time: ${dispatchDateTime ? new Date(dispatchDateTime).toLocaleString('en-IN') : ''}`, LEFT + 10, y + 8);
  doc.text(`Vehicle No: ${invoice.dispatch?.vehicleNumber || ''}`, LEFT + W/2 + 10, y + 8);
  y += 25;
  line(y);

  // Table Header
  const cols = [
    { label: 'Sl. No', w: 40 },
    { label: 'ITEM NAME', w: 0 }, // flexible
    { label: 'HSN CODE', w: 80 },
    { label: 'UNIT', w: 50 },
    { label: 'QUANTITY', w: 70 },
    { label: 'RATE', w: 70 },
    { label: 'AMOUNT', w: 80 }
  ];
  
  const usedW = cols.reduce((acc, c) => acc + c.w, 0);
  cols[1].w = W - usedW;

  let cx = LEFT;
  cols.forEach(c => {
    cell(c.label, cx, y, c.w, 30, { bold: true, align: 'center', bg: '#e0e0e0', valign: 'center', size: 8 });
    cx += c.w;
  });
  y += 30;

  // Table Content
  const rowHeight = 200; 
  cx = LEFT;
  
  cell('1', cx, y, cols[0].w, rowHeight, { align: 'center' }); cx += cols[0].w;
  cell(invoice.grade?.gradeCode || 'Ready Mix Concrete', cx, y, cols[1].w, rowHeight); cx += cols[1].w;
  cell('38245010', cx, y, cols[2].w, rowHeight, { align: 'center' }); cx += cols[2].w;
  cell('Cum', cx, y, cols[3].w, rowHeight, { align: 'center' }); cx += cols[3].w;
  cell(typeof invoice.quantity === 'number' ? invoice.quantity.toFixed(2) : '0.00', cx, y, cols[4].w, rowHeight, { align: 'center' }); cx += cols[4].w;
  
  const rateText = invoice.showRateOnInvoice ? (typeof invoice.rate === 'number' ? invoice.rate.toFixed(2) : '0.00') : '-';
  cell(rateText, cx, y, cols[5].w, rowHeight, { align: 'center' }); cx += cols[5].w;
  
  const amountText = invoice.showRateOnInvoice ? (typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00') : '-';
  cell(amountText, cx, y, cols[6].w, rowHeight, { align: 'center' }); cx += cols[6].w;

  y += rowHeight;

  // Terms & Conditions
  const termsHeight = 100;
  doc.font('Helvetica-Bold').fontSize(9).text('Terms & Conditions:', LEFT + 10, y + 10);
  const terms = [
    '1. Goods once sold will not be taken back.',
    '2. Interest @ 18% p.a. will be charged if payment is not made within due date.',
    '3. Our responsibility ceases as soon as the goods leave our premises.',
    '4. Subject to local jurisdiction.'
  ];
  doc.font('Helvetica').fontSize(8).text(terms.join('\n'), LEFT + 10, y + 25, { width: W - 20 });
  y += termsHeight;
  line(y);

  // Signature sections
  const sigHeight = 110;
  const col1W = W * 0.35;
  const col2W = W * 0.65;
  
  // Left side: Generated by / Approved by
  doc.font('Helvetica').fontSize(9).text('Challan generated by:', LEFT + 10, y + 10);
  doc.text(invoice.generatedByLevel4?.name || '', LEFT + 10, y + 25);
  
  doc.moveTo(LEFT, y + sigHeight/2).lineTo(LEFT + col1W, y + sigHeight/2).stroke();
  
  doc.font('Helvetica').fontSize(9).text('Dispatch approved by:', LEFT + 10, y + sigHeight/2 + 10);

  vLine(LEFT + col1W, y, y + sigHeight);

  // Right side: Received by details
  doc.font('Helvetica').fontSize(9).text('Received by:', LEFT + col1W + 10, y + 10);
  doc.text('Name: __________________________________________________', LEFT + col1W + 10, y + 30);
  doc.text('Designation: ____________________________________________', LEFT + col1W + 10, y + 50);
  doc.text('Time in: ____________________  Time out: ____________________', LEFT + col1W + 10, y + 75);
  
  doc.font('Helvetica-Bold').fontSize(10).text('Signature and Stamp', RIGHT - 120, y + sigHeight - 20);

  y += sigHeight;

  // Disclaimer at the very bottom
  doc.font('Helvetica').fontSize(8).text('This is a computer generated document and does not require a signature', LEFT, doc.page.height - 45, { width: W, align: 'center' });

  doc.end();
}
