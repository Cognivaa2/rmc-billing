import PDFDocument from 'pdfkit';

export function renderBatchsheetPdf(stream, { dispatch, client, grade, batchsheet }) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margins: { top: 35, bottom: 20, left: 35, right: 35 },
  });
  doc.pipe(stream);

  const W = doc.page.width - 70; // usable width
  const LEFT = 35;
  const mix = batchsheet?.mixDesignData || {};
  const batches = mix.batches || [];

  const getActual = (key) => batches.reduce((sum, b) => sum + (parseFloat(b[key]) || 0), 0);
  const getTarget = (key) => parseFloat(mix[`target_${key}`]) || 0;

  const COLORS = {
    headerBg: '#000000',
    headerText: '#ffffff',
    rowEven: '#ffffff',
    rowOdd: '#f8fafc',
    border: '#e2e8f0',
    textMain: '#000000',
    textDim: '#475569',
  };

  // ── Header ────────────────────────────────────────────────────────
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textDim)
    .text(`AUTOGRAPHIC RECORD  ·  PLANT SERIAL NUMBER: ${mix.plantSerialNumber || 'BP-1'}`, LEFT, 25, { align: 'center', width: W });

  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.textMain)
    .text('DOCKET / BATCH REPORT', LEFT, 38, { align: 'center', width: W });

  const dispatchNo = dispatch?.dispatchNumber || '—';
  const batchDate = dispatch?.dispatchDateTime ? new Date(dispatch.dispatchDateTime).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const subHeader = `Enterprise Construction Management System  |  Dispatch: ${dispatchNo}  |  Date: ${batchDate}`;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.textDim)
    .text(subHeader, LEFT, 58, { align: 'center', width: W });

  doc.moveTo(LEFT, 72).lineTo(LEFT + W, 72).strokeColor(COLORS.textMain).lineWidth(1.2).stroke();

  let y = 85;

  // ── Info Grid ───────────────────────────────────────────────────
  const drawInfoGrid = (label, value, x, currentY, isHeader = false) => {
    if (isHeader) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.textMain).text(label, x, currentY);
      doc.moveTo(x, currentY + 11).lineTo(x + (W / 2) - 10, currentY + 11).strokeColor(COLORS.textMain).lineWidth(0.8).stroke();
      return currentY + 18;
    }
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textMain).text(label, x, currentY, { width: 100 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.textMain).text(value || '—', x + 105, currentY, { width: (W / 2) - 115 });
    return currentY + 14;
  };

  let ly = y;
  ly = drawInfoGrid('GENERAL INFORMATION', null, LEFT, ly, true);
  ly = drawInfoGrid('Batch Number', dispatchNo, LEFT, ly);
  ly = drawInfoGrid('Order Number', dispatch?.salesOrder?.orderNumber || '—', LEFT, ly);
  ly = drawInfoGrid('Batch Date', batchDate, LEFT, ly);

  const startTime = dispatch?.dispatchDateTime ? new Date(new Date(dispatch.dispatchDateTime).getTime() - 15 * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  const endTime = dispatch?.dispatchDateTime ? new Date(dispatch.dispatchDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  ly = drawInfoGrid('Batch Time', `${startTime} - ${endTime}`, LEFT, ly);
  ly = drawInfoGrid('Batcher Name', mix.batcherName, LEFT, ly);
  ly = drawInfoGrid('Customer', client?.clientName, LEFT, ly);
  ly = drawInfoGrid('Site', dispatch?.site?.siteName || mix.site, LEFT, ly);
  ly = drawInfoGrid('Grade of Concrete', grade?.gradeCode, LEFT, ly);

  let ry = y;
  ry = drawInfoGrid('DELIVERY & PRODUCTION DETAILS', null, LEFT + (W / 2) + 10, ry, true);
  ry = drawInfoGrid('Recipe Code', mix.recipeCode || grade?.gradeCode, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Recipe Name', mix.recipeName || grade?.gradeCode, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Ordered Quantity', dispatch?.quantity, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Production Quantity', dispatch?.quantity, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('With This Load', dispatch?.quantity, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Truck Number', dispatch?.vehicleNumber || mix.truckNumber, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Truck Driver', mix.truckDriver, LEFT + (W / 2) + 10, ry);
  ry = drawInfoGrid('Adj / Manual Quantity', mix.adjQuantity, LEFT + (W / 2) + 10, ry);

  y = Math.max(ly, ry) + 15;

  // ── Sections ─────────────────────────────────────────────────────
  const SECTIONS = [
    {
      title: '1. AGGREGATE DETAILS',
      items: [
        { key: 'sand1', label: 'SAND (1)' },
        { key: 'sand2', label: 'SAND (2)' },
        { key: 'agg_10mm1', label: '10MM (1)' },
        { key: 'agg_10mm2', label: '10MM (2)' },
        { key: 'agg5', label: 'Agg5' },
        { key: 'agg6', label: 'Agg6' },
      ],
      cols: ['MATERIAL', 'TARGET (KGS)', 'ACTUAL (KGS)', 'MOISTURE (%)']
    },
    {
      title: '2. CEMENT DETAILS',
      items: [
        { key: 'opc', label: 'OPC' },
        { key: 'ppc2', label: 'PPC2' },
        { key: 'cem3', label: 'Cem3' },
        { key: 'cem4', label: 'Cem4' },
        { key: 'flyAsh', label: 'FLY ASH' },
      ],
      cols: ['MATERIAL', 'TARGET (KGS)', 'ACTUAL (KGS)', 'NOTES']
    },
    {
      title: '3. WATER / ICE DETAILS',
      items: [
        { key: 'water', label: 'WAT' },
        { key: 'wtr2', label: 'Wtr2' },
        { key: 'wtr3', label: 'Wtr3' },
      ],
      cols: ['MATERIAL', 'TARGET (KGS)', 'ACTUAL (KGS)', 'NOTES']
    },
    {
      title: '4. ADMIXTURE DETAILS',
      items: [
        { key: 'admi1', label: 'Admi (1)' },
        { key: 'adm', label: 'ADM' },
        { key: 'admi2', label: 'Admi (2)' },
      ],
      cols: ['MATERIAL', 'TARGET (KGS)', 'ACTUAL (KGS)', 'NOTES']
    }
  ];

  const colW = W / 4;
  const rowH = 16;

  const drawSection = (section, startY) => {
    let curY = startY;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.textMain).text(section.title, LEFT, curY);
    curY += 12;

    doc.rect(LEFT, curY, W, rowH).fill(COLORS.headerBg);
    section.cols.forEach((col, i) => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.headerText)
        .text(col, LEFT + (i * colW), curY + 4, { width: colW, align: 'center' });
    });
    curY += rowH;

    section.items.forEach((item, idx) => {
      if (idx % 2 === 1) doc.rect(LEFT, curY, W, rowH).fill('#f8fafc');
      doc.rect(LEFT, curY, W, rowH).strokeColor(COLORS.border).lineWidth(0.2).stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.textMain).text(item.label, LEFT + 8, curY + 4, { width: colW - 10 });
      doc.font('Helvetica').fontSize(7.5).text(getTarget(item.key) || '0', LEFT + colW, curY + 4, { width: colW, align: 'center' });
      doc.font('Helvetica').text(getActual(item.key) || '0', LEFT + (2 * colW), curY + 4, { width: colW, align: 'center' });
      doc.font('Helvetica').text('', LEFT + (3 * colW), curY + 4, { width: colW, align: 'center' });
      curY += rowH;
    });

    return curY + 12;
  };

  SECTIONS.forEach(s => {
    if (y > doc.page.height - 150) {
      doc.addPage();
      y = 35;
    }
    y = drawSection(s, y);
  });

  doc.font('Helvetica-Oblique').fontSize(7).fillColor(COLORS.textDim)
    .text('* Target and Actual values include moisture correction / absorption in % and other corrections in Kgs where applicable.', LEFT, y);

  // ── Footer ────────────────────────────────────────────────────────
  const footerY = doc.page.height - 35;
  doc.moveTo(LEFT, footerY - 5).lineTo(LEFT + W, footerY - 5).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  const footerText = `Generated: ${new Date().toLocaleString()} | Dispatch: ${dispatchNo} | Vehicle: ${dispatch?.vehicleNumber || '—'}`;
  doc.font('Helvetica').fontSize(7).fillColor(COLORS.textDim).text(footerText, LEFT, footerY);
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.textMain).text('Page 1 of 1', LEFT, footerY, { align: 'right', width: W });

  doc.end();
}
