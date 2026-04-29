import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

/**
 * Builds a Delivery Challan document matching the client's exact layout using pdfmake.
 * 
 * @param {Object} data 
 * @returns {Object} pdfmake document definition
 */
export function buildInvoiceDoc({ invoice, client, dispatch, grade, companySettings = {} }) {
  const showRate = invoice.showRateOnInvoice !== false;
  const invoiceDate = new Date(invoice.generatedAt || Date.now()).toLocaleDateString('en-IN');
  const dispatchDT = dispatch?.dispatchDateTime
    ? new Date(dispatch.dispatchDateTime).toLocaleString('en-IN')
    : invoiceDate;

  const quantity = invoice.quantity ?? 0;
  const rate = invoice.rate ?? 0;
  const amount = invoice.amount ?? rate * quantity;

  const companyName = companySettings.companyName || 'COMPANY NAME';
  const regAddress = companySettings.regAddress || '';
  const gstin = companySettings.gstin || '';
  const dispatchAddress = companySettings.dispatchAddress || '';

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      { text: `Challan No: ${invoice.invoiceNumber || ''}`, fontSize: 10 },
                      { text: `Date: ${invoiceDate}`, fontSize: 10, alignment: 'right' }
                    ],
                    margin: [5, 5, 5, 5]
                  },
                  { canvas: [{ type: 'line', x1: -5, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 }] },
                  {
                    stack: [
                      { text: companyName, fontSize: 14, bold: true, alignment: 'center', margin: [0, 5, 0, 2] },
                      { text: `Reg Address: ${regAddress}`, fontSize: 9, alignment: 'center' },
                      { text: `GSTIN: ${gstin}`, fontSize: 9, alignment: 'center' },
                      { text: `Dispatch Address: ${dispatchAddress}`, fontSize: 9, alignment: 'center', margin: [0, 0, 0, 5] }
                    ]
                  },
                  { canvas: [{ type: 'line', x1: -5, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 }] },
                  { text: 'DELIVERY CHALLAN', fontSize: 14, bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
                  { canvas: [{ type: 'line', x1: -5, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 }] },
                  {
                    columns: [
                      {
                        width: '50%',
                        stack: [
                          { text: 'Bill to:', fontSize: 10, bold: true, margin: [5, 5, 0, 2] },
                          { text: client?.clientName || '', fontSize: 10, margin: [5, 0, 0, 0] },
                          { text: client?.officeAddress || '', fontSize: 9, margin: [5, 0, 5, 5] }
                        ]
                      },
                      {
                        width: '50%',
                        stack: [
                          { text: 'Ship to:', fontSize: 10, bold: true, margin: [5, 5, 0, 2] },
                          { text: client?.clientName || '', fontSize: 10, margin: [5, 0, 0, 0] },
                          { text: dispatch?.site?.address || dispatch?.site?.siteName || '', fontSize: 9, margin: [5, 0, 5, 5] }
                        ]
                      }
                    ]
                  },
                  { canvas: [{ type: 'line', x1: -5, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 }] },
                  {
                    columns: [
                      { text: `Dispatch Date & Time: ${dispatchDT}`, fontSize: 10 },
                      { text: `Vehicle No: ${dispatch?.vehicleNumber || ''}`, fontSize: 10, alignment: 'right' }
                    ],
                    margin: [5, 5, 5, 5]
                  },
                  {
                    table: {
                      headerRows: 1,
                      widths: [35, '*', 70, 40, 60, 60, 70],
                      body: [
                        [
                          { text: 'Sl. No', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'ITEM NAME', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'HSN CODE', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'UNIT', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'QUANTITY', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'RATE', alignment: 'center', bold: true, fillColor: '#f2f2f2' },
                          { text: 'AMOUNT', alignment: 'center', bold: true, fillColor: '#f2f2f2' }
                        ],
                        [
                          { text: '1', alignment: 'center', margin: [0, 5, 0, 150] },
                          { text: grade?.gradeCode || 'Ready Mix Concrete', margin: [0, 5, 0, 150] },
                          { text: '38245010', alignment: 'center', margin: [0, 5, 0, 150] },
                          { text: 'Cum', alignment: 'center', margin: [0, 5, 0, 150] },
                          { text: quantity.toFixed(2), alignment: 'center', margin: [0, 5, 0, 150] },
                          { text: showRate ? rate.toFixed(2) : '-', alignment: 'center', margin: [0, 5, 0, 150] },
                          { text: showRate ? amount.toFixed(2) : '-', alignment: 'center', margin: [0, 5, 0, 150] }
                        ]
                      ]
                    },
                    layout: {
                      hLineWidth: function(i) { return 0.5; },
                      vLineWidth: function(i) { return 0.5; },
                      paddingLeft: function(i) { return 4; },
                      paddingRight: function(i) { return 4; },
                      paddingTop: function(i) { return 4; },
                      paddingBottom: function(i) { return 4; }
                    }
                  },
                  {
                    stack: [
                      { text: 'Terms & Conditions:', fontSize: 9, bold: true, margin: [5, 5, 0, 2] },
                      { 
                        text: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within due date.\n3. Our responsibility ceases as soon as the goods leave our premises.\n4. Subject to local jurisdiction.', 
                        fontSize: 8, margin: [5, 0, 5, 5] 
                      }
                    ],
                    minHeight: 80
                  },
                  { canvas: [{ type: 'line', x1: -5, y1: 0, x2: 540, y2: 0, lineWidth: 0.5 }] },
                  {
                    columns: [
                      {
                        width: '35%',
                        stack: [
                          { text: 'Challan generated by:', fontSize: 9, margin: [5, 5, 0, 0] },
                          { text: invoice.generatedByLevel4?.name || '', fontSize: 9, margin: [5, 15, 0, 0] },
                          { canvas: [{ type: 'line', x1: -5, y1: 15, x2: 185, y2: 15, lineWidth: 0.5 }] },
                          { text: 'Dispatch approved by:', fontSize: 9, margin: [5, 25, 0, 0] }
                        ]
                      },
                      {
                        width: '65%',
                        stack: [
                          { text: 'Received by:', fontSize: 9, margin: [5, 5, 0, 0] },
                          { text: 'Name: __________________________________________________', fontSize: 9, margin: [5, 10, 0, 0] },
                          { text: 'Designation: ____________________________________________', fontSize: 9, margin: [5, 10, 0, 0] },
                          { text: 'Time in: ____________________  Time out: ____________________', fontSize: 9, margin: [5, 10, 0, 0] },
                          { text: 'Signature and Stamp', fontSize: 10, bold: true, alignment: 'right', margin: [0, 15, 5, 0] }
                        ]
                      }
                    ]
                  }
                ],
                padding: [0, 0, 0, 0]
              }
            ]
          ]
        },
        layout: {
          hLineWidth: function(i) { return (i === 0 || i === 1 ? 0.5 : 0); },
          vLineWidth: function(i) { return 0.5; },
          paddingLeft: function(i) { return 5; },
          paddingRight: function(i) { return 5; },
          paddingTop: function(i) { return 0; },
          paddingBottom: function(i) { return 0; }
        }
      },
      {
        text: 'This is a computer generated document and does not require a signature',
        fontSize: 8,
        alignment: 'center',
        margin: [0, 10, 0, 0]
      }
    ],
    styles: {
      tableHead: { fontSize: 8, bold: true },
      tableCell: { fontSize: 9 }
    },
    defaultStyle: { font: 'Roboto' }
  };

  return docDefinition;
}

export function downloadInvoicePdf(args, filename) {
  pdfMake
    .createPdf(buildInvoiceDoc(args))
    .download(filename || `${args.invoice?.invoiceNumber || 'challan'}.pdf`);
}
