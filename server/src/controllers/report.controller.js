import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { DispatchForm } from '../models/DispatchForm.js';
import { SalesOrder } from '../models/SalesOrder.js';
import { Client } from '../models/Client.js';
import { Order } from '../models/Order.js';
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
  const orderIds = await Order.find({ salesOrder: { $in: sos.map((s) => s._id) } }).distinct('_id');
  const latestDispatches = await DispatchForm.find({ order: { $in: orderIds } })
    .populate('filledByLevel4', 'name')
    .populate({ path: 'order', select: 'salesOrder' })
    .lean();
  const l4BySo = {};
  for (const d of latestDispatches) {
    const soId = String(d.order?.salesOrder || '');
    if (soId && !l4BySo[soId]) l4BySo[soId] = d.filledByLevel4?.name || '';
  }

  const rowsObj = sos.map((so) => ({
    client: so.client?.clientName || '',
    grade: so.grade?.gradeCode || '',
    status: so.status,
    rate: so.rate,
    quantity: so.totalQuantity,
    level4: l4BySo[String(so._id)] || '',
    level2: so.createdByLevel2?.name || '',
    kyc: so.client?.kycStatus || '',
    credit: so.client?.creditStatus || '',
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
    return writePdfTable(res, {
      title: 'Sales Order Report',
      filename: 'sales-orders',
      headers: ['Client', 'Grade', 'Status', 'Rate', 'Qty', 'L4', 'L2', 'KYC', 'Credit', 'Disp.', 'Rem.'],
      rows: rowsObj.map((r) => [r.client, r.grade, r.status, r.rate, r.quantity, r.level4, r.level2, r.kyc, r.credit, r.dispatchedQty, r.remainingQty]),
    });
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
    return writePdfTable(res, {
      title: 'Client Database Report',
      filename: 'client-database',
      headers: ['Client', 'L3', 'Address', 'KYC', 'GSTIN', 'PAN', 'Contact', 'Email'],
      rows: rowsObj.map((r) => [r.client, r.level3, r.address, r.kyc, r.gstin, r.pan, r.contact, r.email]),
    });
  }
  res.json({ rows: rowsObj });
});
