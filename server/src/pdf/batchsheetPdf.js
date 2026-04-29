import PDFDocument from 'pdfkit';

/**
 * Renders a Docket / Batch Report / Autographic Record PDF that matches the
 * client's physical format:
 *
 *  Header strip  — Batch Date, Batch Start/End Time, Batch Number, Batcher Name,
 *                  Order Number, Customer, Site, Recipe Code/Name, Truck Number,
 *                  Truck Driver, Plant Serial Number, Ordered/Production/Adj/Manual
 *                  Quantity, Mixer Capacity, Batch Size
 *
 *  Mix table     — Columns grouped as:
 *                    Aggregate  : SAND, SAND, 10MM, 10MM
 *                    Cement     : Agg5, Agg6, OPC, PPC2, Cem3, Cem4, Fly Ash
 *                    Water/Ice  : WAT, Wtr2, Wtr3
 *                    Admixture  : Admi, ADM, Admi
 *
 *                  Row 1 — "Recipe targets in Kgs."
 *                  Row 2+ — Actual batch values (from mixDesignData)
 *
 * @param {import('stream').Writable} stream
 * @param {{ dispatch, client, grade, batchsheet, template }} ctx
 */
export function renderBatchsheetPdf(stream, { dispatch, client, grade, batchsheet, template }) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
  });
  doc.pipe(stream);

  const W = doc.page.width - 56; // usable width
  const LEFT = 28;
  const mix = batchsheet?.mixDesignData || {};

  // ── helpers ────────────────────────────────────────────────────────
  const line = (y, x1 = LEFT, x2 = LEFT + W) =>
    doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#555').lineWidth(0.4).stroke();

  const cell = (text, x, y, w, h, opts = {}) => {
    const {
      bold = false,
      size = 7,
      align = 'left',
      bg = null,
      wrap = true,
      color = '#111',
    } = opts;
    if (bg) {
      doc.rect(x, y, w, h).fillColor(bg).fill();
    }
    doc.rect(x, y, w, h).strokeColor('#888').lineWidth(0.3).stroke();
    doc
      .fillColor(color)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .text(String(text ?? ''), x + 2, y + 2, {
        width: w - 4,
        height: h - 2,
        align,
        lineBreak: wrap,
        ellipsis: true,
      });
  };

  const val = (key, fallback = '') => (mix[key] !== undefined ? String(mix[key]) : fallback);

  // ── Title ───────────────────────────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111')
    .text('Docket / Batch Report / Autographic Record', LEFT, 28, {
      width: W,
      align: 'center',
    });

  let y = 46;

  // ── Top metadata (two-column layout) ───────────────────────────────
  const batchDate = dispatch?.dispatchDateTime
    ? new Date(dispatch.dispatchDateTime).toLocaleDateString('en-IN')
    : '';
  const batchStartTime = dispatch?.dispatchDateTime
    ? new Date(new Date(dispatch.dispatchDateTime).getTime() - 15 * 60000).toLocaleTimeString(
        'en-IN',
        { hour12: false },
      )
    : '';
  const batchEndTime = dispatch?.dispatchDateTime
    ? new Date(dispatch.dispatchDateTime).toLocaleTimeString('en-IN', { hour12: false })
    : '';

  const leftFields = [
    ['Batch Date', batchDate],
    ['Batch Start Time', batchStartTime],
    ['Batch End Time', batchEndTime],
    ['', ''],
    ['Batch Number', val('batchNumber', dispatch?.dispatchNumber || '')],
    ['Batcher Name', val('batcherName')],
    ['Order Number', dispatch?.order?.orderNumber || val('orderNumber')],
    ['Customer', client?.clientName || ''],
    ['Site', dispatch?.site?.siteName || val('site')],
  ];

  const centerFields = [
    ['Recipe Code', val('recipeCode', grade?.gradeCode || '')],
    ['Recipe Name', val('recipeName', grade?.gradeCode || '')],
    ['Truck Number', dispatch?.vehicleNumber || val('truckNumber')],
    ['Truck Driver', val('truckDriver')],
  ];

  const rightFields = [
    ['Plant Serial Number', val('plantSerialNumber', 'BP-1')],
    ['', ''],
    ['Ordered Quantity', dispatch?.quantity ?? val('orderedQuantity')],
    ['Production Quantity', val('productionQuantity', dispatch?.quantity ?? '')],
    ['Adj/Manual Quantity', val('adjQuantity')],
    ['With This Load', val('withThisLoad', dispatch?.quantity ?? '')],
    ['Mixer Capacity', val('mixerCapacity')],
    ['Batch Size', val('batchSize')],
  ];

  const colW = W / 3;
  const rowH = 13;
  const fSize = 7.5;
  const labelW = colW * 0.42;
  const valW = colW * 0.55;

  const drawMetaCol = (fields, startX) => {
    let fy = y;
    fields.forEach(([label, value]) => {
      if (!label) { fy += rowH; return; }
      doc.font('Helvetica-Bold').fontSize(fSize).fillColor('#333')
        .text(label, startX, fy, { width: labelW });
      doc.font('Helvetica').fontSize(fSize).fillColor('#111')
        .text(String(value), startX + labelW, fy, { width: valW });
      fy += rowH;
    });
    return fy;
  };

  const ly = drawMetaCol(leftFields, LEFT);
  drawMetaCol(centerFields, LEFT + colW);
  drawMetaCol(rightFields, LEFT + colW * 2);

  y = Math.max(ly, y + leftFields.length * rowH) + 4;
  line(y);
  y += 3;

  // ── Mix Design Table ────────────────────────────────────────────────
  // Column group definitions updated to match image:
  // Agg: 6 cols, Cement: 5 cols, Water: 3 cols, Admixture: 3 cols
  const groups = [
    {
      label: 'Aggregate',
      sub: ['SAND', 'SAND', '10MM', '10MM', 'Agg5', 'Agg6'],
      keys: ['sand1', 'sand2', 'agg_10mm1', 'agg_10mm2', 'agg5', 'agg6'],
    },
    {
      label: 'Cement',
      sub: ['OPC', 'PPC2', 'Cem3', 'Cem4', 'FLY ASH'],
      keys: ['opc', 'ppc2', 'cem3', 'cem4', 'flyAsh'],
    },
    {
      label: 'Water / Ice',
      sub: ['WAT', 'Wtr2', 'Wtr3'],
      keys: ['water', 'wtr2', 'wtr3'],
    },
    {
      label: 'Admixture',
      sub: ['Admi', 'ADM', 'Admi'],
      keys: ['admi1', 'adm', 'admi2'],
    },
  ];

  const totalCols = groups.reduce((s, g) => s + g.sub.length, 0); // 17
  const colW2 = W / totalCols;
  const hdrH = 14;
  const rowH2 = 11;

  // Track used keys to show "Extra" fields later
  const handledKeys = new Set([
    'batchNumber', 'batcherName', 'recipeCode', 'recipeName',
    'truckNumber', 'truckDriver', 'plantSerialNumber', 'orderedQuantity',
    'productionQuantity', 'adjQuantity', 'withThisLoad', 'mixerCapacity',
    'batchSize', 'orderNumber', 'site', 'batches'
  ]);
  groups.forEach(g => {
    g.keys.forEach(k => {
      handledKeys.add(k);
      handledKeys.add(`target_${k}`);
    });
  });

  // Group header row
  let cx = LEFT;
  groups.forEach((g) => {
    const gw = colW2 * g.sub.length;
    cell(g.label, cx, y, gw, hdrH, { bold: true, align: 'center', bg: '#d0d8e8', size: 7.5 });
    cx += gw;
  });
  y += hdrH;

  // Sub-column header row
  cx = LEFT;
  groups.forEach((g) => {
    g.sub.forEach((s) => {
      cell(s, cx, y, colW2, hdrH, { bold: true, align: 'center', bg: '#e8edf5', size: 6.5 });
      cx += colW2;
    });
  });
  y += hdrH;

  // ── Recipe targets row ──────────────────────────────────────────────
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor('#111')
    .text('Recipe targets in Kgs.', LEFT, y + 1, { width: W });

  cx = LEFT;
  groups.forEach((g) => {
    g.keys.forEach((k) => {
      const target = val(`target_${k}`, '0');
      cell(target, cx, y, colW2, rowH2, { align: 'center', size: 6.5, bold: true });
      cx += colW2;
    });
  });
  y += rowH2;

  // Long header text matching image
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor('#111')
    .text('Target and Actual value with moisture correction / absorption in % and other corrections in Kgs.', LEFT, y + 2, { width: W });
  y += rowH2;

  doc
    .font('Helvetica-Bold')
    .fontSize(6)
    .fillColor('#111')
    .text('Mass of Recipe targets in Kgs.', LEFT + W - 150, y + 1, { width: 150, align: 'right' });
  y += 8;

  // ── Actual batch value rows ─────────────────────────────────────────
  const batchRows = mix.batches;
  let rowsData = [];

  if (Array.isArray(batchRows) && batchRows.length > 0) {
    rowsData = batchRows;
  } else {
    // Build a single row from flat keys
    const row = {};
    groups.forEach((g) => g.keys.forEach((k) => { row[k] = val(k, ''); }));
    if (Object.values(row).some(v => v !== '')) {
      rowsData = [row];
    }
  }

  // Each data block in the image has 4 rows.
  // We'll render each entry in rowsData as a 4-row block.
  // Row 1: Target (from val(`target_${k}`))
  // Row 2: Actual (from bRow[k])
  // Row 3: Correction 1 (empty for now or from bRow[`corr1_${k}`])
  // Row 4: Correction 2 (empty for now or from bRow[`corr2_${k}`])
  
  rowsData.slice(0, 10).forEach((bRow) => {
    // Row 1: Targets for this block
    cx = LEFT;
    groups.forEach((g) => {
      g.keys.forEach((k) => {
        const v = val(`target_${k}`, '0');
        cell(v, cx, y, colW2, rowH2, { align: 'center', size: 6 });
        cx += colW2;
      });
    });
    y += rowH2;

    // Row 2: Actuals for this block
    cx = LEFT;
    groups.forEach((g) => {
      g.keys.forEach((k) => {
        const v = bRow[k] !== undefined ? String(bRow[k]) : '';
        cell(v, cx, y, colW2, rowH2, { align: 'center', size: 6, bold: true });
        cx += colW2;
      });
    });
    y += rowH2;

    // Row 3: Empty Correction row
    cx = LEFT;
    groups.forEach((g) => {
      g.keys.forEach(() => {
        cell('', cx, y, colW2, rowH2, { align: 'center', size: 6 });
        cx += colW2;
      });
    });
    y += rowH2;

    // Row 4: Empty Correction row
    cx = LEFT;
    groups.forEach((g) => {
      g.keys.forEach(() => {
        cell('', cx, y, colW2, rowH2, { align: 'center', size: 6 });
        cx += colW2;
      });
    });
    y += rowH2;

    y += 2; // small gap between blocks
  });

  // ── Extra Fields (Custom Data) ──────────────────────────────────────
  const extraFields = Object.entries(mix).filter(([k]) => !handledKeys.has(k));
  if (extraFields.length > 0) {
    y += 10;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333').text('Additional Custom Data', LEFT, y);
    y += 12;
    
    let ex = LEFT;
    extraFields.forEach(([k, v]) => {
      if (typeof v === 'object') return; // skip nested batches etc
      const label = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase();
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
      
      doc.font('Helvetica-Bold').fontSize(7).text(`${capitalized}:`, ex, y, { width: 80 });
      doc.font('Helvetica').fontSize(7).text(String(v), ex + 85, y, { width: 100 });
      
      ex += 200;
      if (ex > LEFT + W - 150) {
        ex = LEFT;
        y += 10;
      }
    });
  }

  // ── Footer ──────────────────────────────────────────────────────────
  const footerY = doc.page.height - 40;
  doc
    .font('Helvetica')
    .fontSize(6.5)
    .fillColor('#888')
    .text(
      `Generated: ${new Date().toLocaleString('en-IN')}   |   Dispatch: ${dispatch?.dispatchNumber || ''}   |   Grade: ${grade?.gradeCode || ''}   |   Vehicle: ${dispatch?.vehicleNumber || ''}`,
      LEFT,
      footerY,
      { width: W, align: 'center' },
    );

  doc.end();
}
