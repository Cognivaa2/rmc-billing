import React from 'react';

export default function InvoicePreviewModal({ invoice, dispatch, client, grade, settings, onClose }) {
  if (!invoice) return null;

  const showRate = invoice.showRateOnInvoice !== false;
  const invoiceDate = new Date(invoice.generatedAt || Date.now()).toLocaleDateString('en-IN');
  const dispatchDT = dispatch?.dispatchDateTime
    ? new Date(dispatch.dispatchDateTime).toLocaleString('en-IN')
    : invoiceDate;

  const quantity = invoice.quantity ?? 0;
  const rate = invoice.rate ?? 0;
  const amount = invoice.amount ?? rate * quantity;

  const companyName = settings?.companyName || 'COMPANY NAME';
  const regAddress = settings?.regAddress || '';
  const gstin = settings?.gstin || '';
  const dispatchAddress = settings?.dispatchAddress || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-8 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="relative flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl print:h-auto print:max-h-none print:shadow-none">
        
        {/* Header - hidden when printing */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 print:hidden">
          <h3 className="font-semibold text-lg text-slate-800">Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className="btn-primary text-sm px-4 py-2"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="btn-secondary text-sm px-4 py-2"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
          <div className="mx-auto w-full max-w-[800px] border border-black bg-white text-black text-[13px] print:max-w-none print:border-none" id="printable-invoice">
            
            {/* Top row */}
            <div className="flex justify-between border-b border-black p-2 print:border-t print:border-black">
              <div>Challan No: <span className="font-medium">{invoice.invoiceNumber || ''}</span></div>
              <div>Date: <span className="font-medium">{invoiceDate}</span></div>
            </div>
            
            {/* Company Info */}
            <div className="border-b border-black p-4 text-center">
              <h1 className="text-xl font-bold uppercase">{companyName}</h1>
              <div className="text-xs mt-1">Reg Address: {regAddress}</div>
              <div className="text-xs">GSTIN: {gstin}</div>
              <div className="text-xs">Dispatch Address: {dispatchAddress}</div>
            </div>
            
            {/* Title */}
            <div className="border-b border-black p-2 text-center bg-slate-50 print:bg-transparent">
              <h2 className="text-base font-bold uppercase tracking-wider">Delivery Challan</h2>
            </div>
            
            {/* Bill to / Ship to */}
            <div className="grid grid-cols-2 border-b border-black">
              <div className="border-r border-black p-3">
                <div className="font-bold mb-1">Bill to:</div>
                <div className="font-medium">{client?.clientName || ''}</div>
                <div className="text-xs whitespace-pre-wrap text-gray-700">{client?.officeAddress || ''}</div>
              </div>
              <div className="p-3">
                <div className="font-bold mb-1">Ship to:</div>
                <div className="font-medium">{client?.clientName || ''}</div>
                <div className="text-xs whitespace-pre-wrap text-gray-700">{dispatch?.site?.siteAddress || dispatch?.site?.siteName || ''}</div>
              </div>
            </div>
            
            {/* Dispatch info */}
            <div className="flex justify-between border-b border-black p-2 bg-slate-50 print:bg-transparent">
              <div>Dispatch Date & Time: <span className="font-medium">{dispatchDT}</span></div>
              <div>Vehicle No: <span className="font-medium">{dispatch?.vehicleNumber || ''}</span></div>
            </div>
            
            {/* Table */}
            <div className="w-full">
              <table className="w-full text-center border-b border-black border-collapse">
                <thead>
                  <tr className="border-b border-black bg-slate-100 print:bg-transparent">
                    <th className="border-r border-black p-2 w-12 font-bold text-xs">Sl. No</th>
                    <th className="border-r border-black p-2 font-bold text-xs">ITEM NAME</th>
                    <th className="border-r border-black p-2 w-24 font-bold text-xs">HSN CODE</th>
                    <th className="border-r border-black p-2 w-16 font-bold text-xs">UNIT</th>
                    <th className="border-r border-black p-2 w-20 font-bold text-xs">QUANTITY</th>
                    <th className="border-r border-black p-2 w-24 font-bold text-xs">RATE</th>
                    <th className="p-2 w-28 font-bold text-xs">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top">1</td>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top text-left font-medium">{grade?.gradeCode || 'Ready Mix Concrete'}</td>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top">38245010</td>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top">Cum</td>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top">{quantity.toFixed(2)}</td>
                    <td className="border-r border-black p-2 pt-4 pb-48 align-top">{showRate ? rate.toFixed(2) : '-'}</td>
                    <td className="p-2 pt-4 pb-48 align-top">{showRate ? amount.toFixed(2) : '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Terms */}
            <div className="border-b border-black p-3 text-xs">
              <div className="font-bold mb-1">Terms & Conditions:</div>
              <ol className="list-decimal list-inside text-gray-800 space-y-0.5">
                <li>Goods once sold will not be taken back.</li>
                <li>Interest @ 18% p.a. will be charged if payment is not made within due date.</li>
                <li>Our responsibility ceases as soon as the goods leave our premises.</li>
                <li>Subject to local jurisdiction.</li>
              </ol>
            </div>
            
            {/* Signatures */}
            <div className="grid grid-cols-3 text-xs min-h-[120px]">
              <div className="col-span-1 border-r border-black p-3 flex flex-col justify-between">
                <div>
                  <div className="mb-8">Challan generated by:</div>
                  <div className="font-medium">{invoice?.generatedByLevel4?.name || ''}</div>
                </div>
                <div className="mt-4 border-t border-black pt-2">Dispatch approved by:</div>
              </div>
              <div className="col-span-2 p-3 flex flex-col justify-between">
                <div>
                  <div className="mb-4">Received by:</div>
                  <div className="space-y-4 text-gray-600">
                    <div>Name: <span className="inline-block w-64 border-b border-gray-400"></span></div>
                    <div>Designation: <span className="inline-block w-56 border-b border-gray-400"></span></div>
                    <div className="flex gap-4">
                      <span>Time in: <span className="inline-block w-24 border-b border-gray-400"></span></span>
                      <span>Time out: <span className="inline-block w-24 border-b border-gray-400"></span></span>
                    </div>
                  </div>
                </div>
                <div className="text-right font-bold pr-4 mt-8">Signature and Stamp</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-xs text-slate-500 print:mt-2">
            This is a computer generated document and does not require a signature
          </div>
        </div>
      </div>
      
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 1px solid black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:h-auto {
            height: auto !important;
          }
          .print\\:max-h-none {
            max-height: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-transparent {
            background-color: transparent !important;
          }
          .print\\:mt-2 {
            margin-top: 0.5rem !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
