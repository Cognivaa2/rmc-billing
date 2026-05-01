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

  // Helper to sum actual values across all cycles
  const getActual = (key) => {
    return batches.reduce((sum, b) => sum + (parseFloat(b[key]) || 0), 0);
  };

  const getTarget = (key) => parseFloat(mix[`target_${key}`]) || 0;

  // ── Colors & Styles ───────────────────────────────────────────────
  const COLORS = {
    headerBg: '#000000',
    headerText: '#ffffff',
    rowEven: '#ffffff',
    rowOdd: '#f8fafc',
    border: '#cbd5e1',
    textMain: '#1e293b',
    textDim: '#64748b',
  };

  // ── Header ────────────────────────────────────────────────────────
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.textDim)
    .text(`AUTOGRAPHIC RECORD  ·  PLANT SERIAL NUMBER: ${mix.plantSerialNumber || 'BP-1'}`, LEFT, 35, { align: 'center', width: W });

  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(COLORS.textMain)
    .text('DOCKET / BATCH REPORT', LEFT, 48, { align: 'center', width: W });

  const subHeader = `Enterprise Construction Management System  |  Dispatch: ${dispatch?.dispatchNumber || 'N/A'}  |  Date: ${dispatch?.dispatchDateTime ? new Date(dispatch.dispatchDateTime).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`;
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(COLORS.textDim)
    .text(subHeader, LEFT, 68, { align: 'center', width: W });

  doc.moveTo(LEFT, 78).lineTo(LEFT + W, 78).strokeColor(COLORS.textMain).lineWidth(1).stroke();

  let y = 88;

  // ── General Information Grid ─────────────────────────────────────
  const infoRowH = 14;
  const col1X = LEFT;
  const col2X = LEFT + W / 2 + 10;
  const labelW = 90;

  const drawInfoRow = (label, value, x, currentY, isHeader = false) => {
    if (isHeader) {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.textMain).text(label, x, currentY);
      doc.moveTo(x, currentY + 11).lineTo(x + W / 2 - 10, currentY + 11).strokeColor(COLORS.textMain).lineWidth(0.8).stroke();
      return currentY + 18;
    }
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.textMain).text(label, x, currentY, { width: labelW, lineBreak: false });
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.textMain).text(value || '—', x + labelW, currentY, { width: W / 2 - labelW - 10, lineBreak: false });
    return currentY + infoRowH;
  };

  // Left Column
  let ly = y;
  ly = drawInfoRow('GENERAL INFORMATION', null, col1X, ly, true);
  ly = drawInfoRow('Batch Number', dispatch?.dispatchNumber || mix.batchNumber, col1X, ly);
  ly = drawInfoRow('Order Number', dispatch?.order?.orderNumber || mix.orderNumber, col1X, ly);
  ly = drawInfoRow('Batch Date', dispatch?.dispatchDateTime ? new Date(dispatch.dispatchDateTime).toLocaleDateString('en-GB') : '—', col1X, ly);

  const startTime = dispatch?.dispatchDateTime ? new Date(new Date(dispatch.dispatchDateTime).getTime() - 15 * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
  const endTime = dispatch?.dispatchDateTime ? new Date(dispatch.dispatchDateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
  const bTime = (startTime && endTime) ? `${startTime} - ${endTime}` : '—';
  ly = drawInfoRow('Batch Time', bTime, col1X, ly);
  ly = drawInfoRow('Batcher Name', mix.batcherName, col1X, ly);
  ly = drawInfoRow('Customer', client?.clientName || '—', col1X, ly);
  ly = drawInfoRow('Site', dispatch?.site?.siteName || mix.site, col1X, ly);
  ly = drawInfoRow('Grade of Concrete', grade?.gradeCode || '—', col1X, ly);

  // Right Column
  let ry = y;
  ry = drawInfoRow('DELIVERY & PRODUCTION DETAILS', null, col2X, ry, true);
  ry = drawInfoRow('Recipe Code', mix.recipeCode || grade?.gradeCode, col2X, ry);
  ry = drawInfoRow('Recipe Name', mix.recipeName || grade?.gradeCode, col2X, ry);
  ry = drawInfoRow('Ordered Quantity', dispatch?.quantity ? `${dispatch.quantity}` : '—', col2X, ry);
  ry = drawInfoRow('Production Quantity', dispatch?.quantity ? `${dispatch.quantity}` : '—', col2X, ry);
  ry = drawInfoRow('With This Load', dispatch?.quantity ? `${dispatch.quantity}` : '—', col2X, ry);
  ry = drawInfoRow('Truck Number', dispatch?.vehicleNumber || mix.truckNumber, col2X, ry);
  ry = drawInfoRow('Truck Driver', mix.truckDriver, col2X, ry);
  ry = drawInfoRow('Adj / Manual Quantity', mix.adjQuantity, col2X, ry);

  y = Math.max(ly, ry) + 15;

  // ── Material Tables Sections ─────────────────────────────────────
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

  const tableW = (W / 2) - 5;
  const cellW = tableW / 4;
  const rowH = 15;

  const drawSection = (section, x, startY) => {
    let curY = startY;

    // Title
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.textMain).text(section.title, x, curY, { lineBreak: false });
    curY += 12;

    // Header
    doc.rect(x, curY, tableW, rowH).fill(COLORS.headerBg);
    section.cols.forEach((col, i) => {
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.headerText)
        .text(col, x + i * cellW, curY + 4, { width: cellW, align: 'center', lineBreak: false });
    });
    curY += rowH;

    // Rows
    section.items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.rect(x, curY, tableW, rowH).fill('#f1f5f9');
      }
      doc.rect(x, curY, tableW, rowH).strokeColor(COLORS.border).lineWidth(0.2).stroke();

      const target = getTarget(item.key);
      const actual = getActual(item.key);

      doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.textMain).text(item.label, x + 5, curY + 4, { width: cellW - 5, lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMain).text(target || '0', x + cellW, curY + 4, { width: cellW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMain).text(actual || '0', x + 2 * cellW, curY + 4, { width: cellW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor(COLORS.textMain).text('', x + 3 * cellW, curY + 4, { width: cellW, align: 'center', lineBreak: false });

      curY += rowH;
    });

    return curY;
  };

  // Row 1: Aggregates and Cement
  const y1 = drawSection(SECTIONS[0], LEFT, y);
  const y2 = drawSection(SECTIONS[1], LEFT + W / 2 + 5, y);

  y = Math.max(y1, y2) + 15;

  // Row 2: Water and Admixtures
  const y3 = drawSection(SECTIONS[2], LEFT, y);
  const y4 = drawSection(SECTIONS[3], LEFT + W / 2 + 5, y);

  y = Math.max(y3, y4) + 10;

  // ── Footer Note ───────────────────────────────────────────────────
  doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(COLORS.textDim)
    .text('* Target and Actual values include moisture correction / absorption in % and other corrections in Kgs where applicable.', LEFT, y, { lineBreak: false });

  // ── Page Footer ───────────────────────────────────────────────────
  const footerY = doc.page.height - 35;
  doc.moveTo(LEFT, footerY - 5).lineTo(LEFT + W, footerY - 5).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  const now = new Date().toLocaleString('en-GB', { hour12: true });
  const footerLeft = `Generated: ${now}  |  Dispatch: ${dispatch?.dispatchNumber || '—'}  |  Vehicle: ${dispatch?.vehicleNumber || '—'}`;

  doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.textDim).text(footerLeft, LEFT, footerY, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.textMain).text('Page 1 of 1', LEFT, footerY, { align: 'right', width: W, lineBreak: false });

  doc.end();
}
