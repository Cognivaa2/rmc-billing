import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DispatchForm } from '../models/DispatchForm.js';
import { SalesOrder } from '../models/SalesOrder.js';
import { Client } from '../models/Client.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { asyncHandler } from '../middleware/errorHandler.js';

function parseRange(req) {
  const { from, to } = req.query;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return Object.keys(range).length ? range : null;
}

async function writeExcel(res, { title, columns, rows, filename }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(title);
  ws.columns = columns;
  rows.forEach((r) => ws.addRow(r));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

function writePdfTable(res, { title, headers, rows, filename }) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(title);
  doc.fontSize(9).fillColor('#777').text(`Generated ${new Date().toISOString()}`);
  doc.fillColor('#000').moveDown(0.7);

  const pageWidth = doc.page.width - 72;
  const colWidth = pageWidth / headers.length;
  const startX = 36;
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  headers.forEach((h, i) => {
    doc.text(String(h), startX + i * colWidth, y, { width: colWidth - 4 });
  });
  y += 18;
  doc.moveTo(36, y - 4).lineTo(doc.page.width - 36, y - 4).stroke();
  doc.font('Helvetica');

  for (const row of rows) {
    if (y > doc.page.height - 48) {
      doc.addPage();
      y = 36;
    }
    row.forEach((cell, i) => {
      doc.text(cell == null ? '' : String(cell), startX + i * colWidth, y, {
        width: colWidth - 4,
        ellipsis: true,
      });
    });
    y += 16;
  }

  doc.end();
}

// REPORT 1 — Daily Dispatch
export const dailyDispatchReport = asyncHandler(async (req, res) => {
  const filter = {};
  const range = parseRange(req);
  if (range) filter.dispatchDateTime = range;

  const dispatches = await DispatchForm.find(filter)
    .populate({ path: 'order', populate: [{ path: 'createdByLevel3', select: 'name' }, { path: 'saleAuthorizedByLevel2', select: 'name' }] })
    .populate('client', 'clientName')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode')
    .populate('filledByLevel4', 'name')
    .sort({ dispatchDateTime: -1 })
    .lean();

  const rowsObj = dispatches.map((d) => ({
    dateTime: d.dispatchDateTime ? new Date(d.dispatchDateTime).toISOString() : '',
    level4: d.filledByLevel4?.name || '',
    level3: d.order?.createdByLevel3?.name || '',
    client: d.client?.clientName || '',
    site: d.site?.siteName || '',
    grade: d.grade?.gradeCode || '',
    quantity: d.quantity ?? '',
    rate: d.order?.negotiatedRate ?? '',
    level2: d.order?.saleAuthorizedByLevel2?.name || '',
  }));

  const format = req.query.format || 'json';
  if (format === 'xlsx') {
    return writeExcel(res, {
      title: 'Daily Dispatch',
      filename: 'daily-dispatch',
      columns: [
        { header: 'Date/Time', key: 'dateTime', width: 24 },
        { header: 'Level 4 Name', key: 'level4', width: 20 },
        { header: 'Level 3 Name', key: 'level3', width: 20 },
        { header: 'Client Name', key: 'client', width: 24 },
        { header: 'Site Name', key: 'site', width: 18 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Rate', key: 'rate', width: 12 },
        { header: 'Level 2 Name', key: 'level2', width: 20 },
      ],
      rows: rowsObj,
    });
  }
  if (format === 'pdf') {
    return writePdfTable(res, {
      title: 'Daily Dispatch Report',
      filename: 'daily-dispatch',
      headers: ['Date/Time', 'L4', 'L3', 'Client', 'Site', 'Grade', 'Qty', 'Rate', 'L2'],
      rows: rowsObj.map((r) => [r.dateTime, r.level4, r.level3, r.client, r.site, r.grade, r.quantity, r.rate, r.level2]),
    });
  }
  res.json({ rows: rowsObj });
});

// REPORT 2 — Sales Order
export const salesOrderReport = asyncHandler(async (req, res) => {
  const sos = await SalesOrder.find()
    .populate('client', 'clientName kycStatus creditStatus')
    .populate('grade', 'gradeCode')
    .populate('createdByLevel2', 'name')
    .populate('closedByLevel2', 'name')
    .sort({ createdAt: -1 })
    .lean();

  // latest dispatch against each SO for "Level 4 Name"
  const latestDispatches = await DispatchForm.find({ salesOrder: { $in: sos.map((s) => s._id) } })
    .populate('filledByLevel4', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const l4BySo = {};
  for (const d of latestDispatches) {
    const soId = String(d.salesOrder || '');
    if (soId && !l4BySo[soId]) l4BySo[soId] = d.filledByLevel4?.name || '';
  }

  const rowsObj = sos.map((so) => ({
    client: so.client?.clientName || '',
    grade: so.grade?.gradeCode || '',
    status: (so.status || 'open').toUpperCase(),
    rate: so.rate,
    quantity: so.totalQuantity,
    level4: l4BySo[String(so._id)] || '-',
    level2: so.createdByLevel2?.name || '',
    kyc: so.client?.kycStatus || 'pending',
    credit: so.client?.creditStatus || 'regular',
    dispatchedQty: so.dispatchedQuantity,
    remainingQty: so.remainingQuantity,
  }));

  const format = req.query.format || 'json';
  if (format === 'xlsx') {
    return writeExcel(res, {
      title: 'Sales Orders',
      filename: 'sales-orders',
      columns: [
        { header: 'Client Name', key: 'client', width: 24 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'SO Status', key: 'status', width: 12 },
        { header: 'Rate', key: 'rate', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Level 4 Name', key: 'level4', width: 18 },
        { header: 'Level 2 Name', key: 'level2', width: 18 },
        { header: 'KYC Status', key: 'kyc', width: 14 },
        { header: 'Credit Status', key: 'credit', width: 14 },
        { header: 'Dispatched Qty', key: 'dispatchedQty', width: 14 },
        { header: 'Remaining Qty', key: 'remainingQty', width: 14 },
      ],
      rows: rowsObj,
    });
  }
  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales-order-report.pdf"`);
    doc.pipe(res);

    const formatNum = (n) => (n != null ? Number(n).toLocaleString('en-US') : '-');
    const toTitleCase = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

    const headers = ['Client', 'Grade', 'Status', 'Rate', 'Qty', 'L4', 'L2', 'KYC', 'Credit', 'Disp.', 'Rem.'];
    const colWidths = [80, 35, 45, 45, 30, 60, 60, 45, 45, 40, 40];
    const startX = 40;
    const tableWidth = 515;

    const drawHeader = () => {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#334155').text('Sales Order Report', { align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(startX, doc.y).lineTo(startX + tableWidth, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.moveDown(1);
    };

    const drawTableHeader = (y) => {
      doc.rect(startX, y - 5, tableWidth, 20).fill('#f1f5f9');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
      let curX = startX;
      headers.forEach((h, i) => {
        doc.text(h, curX + 3, y, { width: colWidths[i] - 5 });
        curX += colWidths[i];
      });
      return y + 20;
    };

    const drawFooter = () => {
      const footerY = doc.page.height - 50;
      doc.save();
      doc.moveTo(startX, footerY - 5).lineTo(startX + tableWidth, footerY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('Confidential - Internal Business Use Only | Generated via Enterprise Dashboard', startX, footerY, { align: 'center', width: tableWidth });
      doc.restore();
    };

    drawHeader();
    let y = drawTableHeader(doc.y);

    if (rowsObj.length === 0) {
      doc.font('Helvetica').fontSize(9).text('No data available.', startX, y + 20);
    } else {
      doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b');
      for (const r of rowsObj) {
        const rowData = [
          r.client, r.grade, toTitleCase(r.status), formatNum(r.rate),
          String(r.quantity), r.level4, r.level2, toTitleCase(r.kyc),
          toTitleCase(r.credit), String(r.dispatchedQty), String(r.remainingQty),
        ];

        let maxRowHeight = 12;
        rowData.forEach((text, i) => {
          const h = doc.heightOfString(String(text || '-'), { width: colWidths[i] - 5 });
          if (h > maxRowHeight) maxRowHeight = h;
        });

        if (y + maxRowHeight > doc.page.height - 70) {
          drawFooter();
          doc.addPage();
          drawHeader();
          y = drawTableHeader(doc.y);
        }

        let curX = startX;
        rowData.forEach((text, i) => {
          doc.text(String(text || '-'), curX + 3, y, { width: colWidths[i] - 5 });
          curX += colWidths[i];
        });

        y += maxRowHeight + 5;
        doc.moveTo(startX, y - 2).lineTo(startX + tableWidth, y - 2).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      }
    }

    drawFooter();
    doc.end();
    return;
  }
  res.json({ rows: rowsObj });
});

// REPORT 3 — Client Database
export const clientDatabaseReport = asyncHandler(async (req, res) => {
  const clients = await Client.find().populate('createdByLevel3', 'name').sort({ clientName: 1 }).lean();
  const rowsObj = clients.map((c) => ({
    client: c.clientName,
    level3: c.createdByLevel3?.name || '',
    address: c.officeAddress,
    kyc: c.kycStatus,
    kycDocsCount: c.kycData?.documents?.length || 0,
    gstin: c.taxInformation?.gstin || '',
    pan: c.taxInformation?.pan || '',
    otherTaxId: c.taxInformation?.otherTaxId || '',
    contact: c.contactNumber,
    email: c.email || '',
  }));

  const format = req.query.format || 'json';
  if (format === 'xlsx') {
    return writeExcel(res, {
      title: 'Clients',
      filename: 'client-database',
      columns: [
        { header: 'Client Name', key: 'client', width: 26 },
        { header: 'Level 3 Name', key: 'level3', width: 20 },
        { header: 'Office Address', key: 'address', width: 36 },
        { header: 'KYC Status', key: 'kyc', width: 12 },
        { header: 'KYC Docs', key: 'kycDocsCount', width: 10 },
        { header: 'GSTIN', key: 'gstin', width: 18 },
        { header: 'PAN', key: 'pan', width: 14 },
        { header: 'Other Tax ID', key: 'otherTaxId', width: 16 },
        { header: 'Contact No.', key: 'contact', width: 16 },
        { header: 'Email', key: 'email', width: 24 },
      ],
      rows: rowsObj,
    });
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="client-database-report.pdf"`);
    doc.pipe(res);

    const toTitleCase = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

    const headers = ['CLIENT NAME', 'LEVEL 3 NAME', 'OFFICE ADDRESS', 'KYC DATA', 'TAX INFO', 'CONTACT', 'EMAIL'];
    const colWidths = [85, 65, 110, 55, 75, 60, 65];
    const startX = 40;
    const tableWidth = 515;

    const drawHeader = () => {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text('Client Database Report', { align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}  •  Enterprise Client Management Module`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(startX, doc.y).lineTo(startX + tableWidth, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.moveDown(1);
    };

    const drawTableHeader = (y) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8');
      let curX = startX;
      headers.forEach((h, i) => {
        doc.text(h, curX + 3, y, { width: colWidths[i] - 5 });
        curX += colWidths[i];
      });
      doc.moveTo(startX, y + 12).lineTo(startX + tableWidth, y + 12).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      return y + 20;
    };

    const drawFooter = () => {
      const footerY = doc.page.height - 50;
      doc.save();
      doc.moveTo(startX, footerY - 5).lineTo(startX + tableWidth, footerY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('Confidential Document — Internal Use Only | Page 1 of 1', startX, footerY, { align: 'center', width: tableWidth });
      doc.restore();
    };

    drawHeader();
    let y = drawTableHeader(doc.y);

    doc.fontSize(7.5).fillColor('#334155');
    for (const r of rowsObj) {
      const taxText = r.gstin ? `GSTIN:\n${r.gstin}` : (r.pan ? `PAN:\n${r.pan}` : '-');

      // Calculate max height
      const h1 = doc.heightOfString(r.client, { width: colWidths[0] - 5, font: 'Helvetica-Bold' });
      const h2 = doc.heightOfString(r.address, { width: colWidths[2] - 5 });
      const h3 = doc.heightOfString(taxText, { width: colWidths[4] - 5 });
      const maxRowHeight = Math.max(h1, h2, h3, 20);

      if (y + maxRowHeight > doc.page.height - 70) {
        drawFooter();
        doc.addPage();
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      let curX = startX;

      // Client Name (Bold)
      doc.font('Helvetica-Bold').text(r.client, curX + 3, y, { width: colWidths[0] - 5 }); curX += colWidths[0];

      // L3 Name
      doc.font('Helvetica').text(r.level3, curX + 3, y, { width: colWidths[1] - 5 }); curX += colWidths[1];

      // Address
      doc.text(r.address, curX + 3, y, { width: colWidths[2] - 5 }); curX += colWidths[2];

      // KYC Badge
      const kycStatus = r.kyc?.toLowerCase() || 'pending';
      const isVerified = kycStatus === 'verified' || kycStatus === 'approved';
      const badgeColor = isVerified ? '#1d4ed8' : '#b45309';
      const badgeBg = isVerified ? '#eff6ff' : '#fffbeb';

      doc.save();
      doc.roundedRect(curX + 5, y, 40, 10, 2).fill(badgeBg);
      doc.fillColor(badgeColor).fontSize(6.5).font('Helvetica-Bold').text(toTitleCase(kycStatus), curX + 5, y + 2, { width: 40, align: 'center' });
      doc.restore();
      curX += colWidths[3];

      // Tax Info
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text('GSTIN:', curX + 3, y);
      doc.fillColor('#334155').font('Helvetica-Bold').text(r.gstin || r.pan || '-', curX + 3, y + 9, { width: colWidths[4] - 5 });
      curX += colWidths[4];

      // Contact
      doc.font('Helvetica').fillColor('#334155').text(r.contact, curX + 3, y, { width: colWidths[5] - 5 }); curX += colWidths[5];

      // Email
      doc.text(r.email, curX + 3, y, { width: colWidths[6] - 5 }); curX += colWidths[6];

      y += maxRowHeight + 15;
      doc.moveTo(startX, y - 5).lineTo(startX + tableWidth, y - 5).strokeColor('#f8fafc').lineWidth(0.5).stroke();
    }

    drawFooter();
    doc.end();
    return;
  }
  res.json({ rows: rowsObj });
});

// REPORT 4 — Order Database (Date-wise)
export const orderReport = asyncHandler(async (req, res) => {
  const filter = {};
  const range = parseRange(req);
  if (range) filter.createdAt = range;

  const orders = await Order.find(filter)
    .populate('client', 'clientName')
    .populate('site', 'siteName')
    .populate('grade', 'gradeCode')
    .populate('createdByLevel3', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const rowsObj = orders.map((o) => ({
    date: o.createdAt ? new Date(o.createdAt).toISOString() : '',
    orderNumber: o.orderNumber,
    client: o.client?.clientName || '',
    site: o.site?.siteName || '',
    grade: o.grade?.gradeCode || '',
    quantity: o.quantity ?? '',
    rate: o.negotiatedRate ?? '',
    status: o.status,
    level3: o.createdByLevel3?.name || '',
  }));

  const format = req.query.format || 'json';
  if (format === 'xlsx') {
    return writeExcel(res, {
      title: 'Orders',
      filename: 'orders',
      columns: [
        { header: 'Date', key: 'date', width: 24 },
        { header: 'Order No', key: 'orderNumber', width: 16 },
        { header: 'Client Name', key: 'client', width: 24 },
        { header: 'Site', key: 'site', width: 18 },
        { header: 'Grade', key: 'grade', width: 10 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Rate', key: 'rate', width: 12 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Level 3', key: 'level3', width: 20 },
      ],
      rows: rowsObj,
    });
  }
  if (format === 'pdf') {
    return writePdfTable(res, {
      title: 'Order Report',
      filename: 'orders',
      headers: ['Date', 'Order No', 'Client', 'Site', 'Grade', 'Qty', 'Rate', 'Status', 'L3'],
      rows: rowsObj.map((r) => [r.date, r.orderNumber, r.client, r.site, r.grade, r.quantity, r.rate, r.status, r.level3]),
    });
  }
  res.json({ rows: rowsObj });
});

// REPORT 5 — Payment Database (Date-wise)
export const paymentReport = asyncHandler(async (req, res) => {
  const filter = {};
  const range = parseRange(req);
  if (range) filter.createdAt = range;

  const payments = await Payment.find(filter)
    .populate('client', 'clientName')
    .populate('invoice', 'invoiceNumber')
    .populate('recordedByLevel2', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const rowsObj = payments.map((p) => ({
    date: p.createdAt ? new Date(p.createdAt).toISOString() : '',
    client: p.client?.clientName || '',
    invoice: p.invoice?.invoiceNumber || '',
    amount: p.amount ?? '',
    received: p.paymentReceived ? 'Yes' : 'No',
    receivedAt: p.receivedAt ? new Date(p.receivedAt).toISOString() : '',
    recordedBy: p.recordedByLevel2?.name || '',
    remarks: p.remarks || '',
  }));

  const format = req.query.format || 'json';
  if (format === 'xlsx') {
    return writeExcel(res, {
      title: 'Payments',
      filename: 'payments',
      columns: [
        { header: 'Created Date', key: 'date', width: 24 },
        { header: 'Client Name', key: 'client', width: 24 },
        { header: 'Invoice', key: 'invoice', width: 18 },
        { header: 'Amount', key: 'amount', width: 14 },
        { header: 'Received', key: 'received', width: 10 },
        { header: 'Received At', key: 'receivedAt', width: 24 },
        { header: 'Recorded By', key: 'recordedBy', width: 20 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ],
      rows: rowsObj,
    });
  }
  if (format === 'pdf') {
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payment-report.pdf"`);
    doc.pipe(res);

    const formatNum = (n) => (n != null ? Number(n).toLocaleString('en-US') : '-');
    const toTitleCase = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const headers = ['DATE', 'CLIENT NAME', 'INVOICE', 'AMOUNT', 'STATUS', 'RCVD AT', 'BY'];
    const colWidths = [65, 100, 70, 70, 60, 75, 75];
    const startX = 40;
    const tableWidth = 515;

    const drawHeader = () => {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text('Payment History Report', { align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}  •  Enterprise Financial Module`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(startX, doc.y).lineTo(startX + tableWidth, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.moveDown(1);
    };

    const drawTableHeader = (y) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8');
      let curX = startX;
      headers.forEach((h, i) => {
        doc.text(h, curX + 3, y, { width: colWidths[i] - 5 });
        curX += colWidths[i];
      });
      doc.moveTo(startX, y + 12).lineTo(startX + tableWidth, y + 12).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
      return y + 20;
    };

    const drawFooter = () => {
      const footerY = doc.page.height - 50;
      doc.save();
      doc.moveTo(startX, footerY - 5).lineTo(startX + tableWidth, footerY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8').text('Confidential Financial Document — Internal Use Only | Page 1 of 1', startX, footerY, { align: 'center', width: tableWidth });
      doc.restore();
    };

    drawHeader();
    let y = drawTableHeader(doc.y);

    doc.fontSize(7.5).fillColor('#334155');
    for (const r of rowsObj) {
      // Calculate max height
      const h1 = doc.heightOfString(r.client, { width: colWidths[1] - 5, font: 'Helvetica-Bold' });
      const h2 = doc.heightOfString(r.recordedBy, { width: colWidths[6] - 5 });
      const maxRowHeight = Math.max(h1, h2, 20);

      if (y + maxRowHeight > doc.page.height - 70) {
        drawFooter();
        doc.addPage();
        drawHeader();
        y = drawTableHeader(doc.y);
      }

      let curX = startX;

      // Date
      doc.font('Helvetica').text(formatDate(r.date), curX + 3, y, { width: colWidths[0] - 5 }); curX += colWidths[0];

      // Client (Bold)
      doc.font('Helvetica-Bold').text(r.client, curX + 3, y, { width: colWidths[1] - 5 }); curX += colWidths[1];

      // Invoice
      doc.font('Helvetica').text(r.invoice || '-', curX + 3, y, { width: colWidths[2] - 5 }); curX += colWidths[2];

      // Amount
      doc.font('Helvetica-Bold').text(formatNum(r.amount), curX + 3, y, { width: colWidths[3] - 5 }); curX += colWidths[3];

      // Status Badge
      const isReceived = r.received === 'Yes';
      const badgeColor = isReceived ? '#15803d' : '#b91c1c';
      const badgeBg = isReceived ? '#dcfce7' : '#fee2e2';
      const statusText = isReceived ? 'Success' : 'Pending';

      doc.save();
      doc.roundedRect(curX + 5, y, 40, 10, 2).fill(badgeBg);
      doc.fillColor(badgeColor).fontSize(6.5).font('Helvetica-Bold').text(statusText, curX + 5, y + 2, { width: 40, align: 'center' });
      doc.restore();
      curX += colWidths[4];

      // Received At
      doc.font('Helvetica').fillColor('#64748b').text(formatDate(r.receivedAt), curX + 3, y, { width: colWidths[5] - 5 }); curX += colWidths[5];

      // Recorded By
      doc.fillColor('#334155').text(r.recordedBy, curX + 3, y, { width: colWidths[6] - 5 }); curX += colWidths[6];

      y += maxRowHeight + 15;
      doc.moveTo(startX, y - 5).lineTo(startX + tableWidth, y - 5).strokeColor('#f8fafc').lineWidth(0.5).stroke();
    }

    drawFooter();
    doc.end();
    return;
  }
  res.json({ rows: rowsObj });
});
