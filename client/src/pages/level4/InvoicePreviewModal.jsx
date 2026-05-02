import React from 'react';

export default function InvoicePreviewModal({ invoice, dispatch, client, grade, settings, onClose }) {
  if (!invoice) return null;

  const showRate = invoice.showRateOnInvoice !== false;
  const invoiceDate = new Date(invoice.generatedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  
  const quantity = invoice.quantity ?? 0;
  const rate = invoice.rate ?? 0;
  const amount = invoice.amount ?? rate * quantity;
  const cgst = amount * 0.09;
  const sgst = amount * 0.09;
  const total = amount + cgst + sgst;

  const companyName = settings?.companyName || 'COMPANY NAME';
  const regAddress = settings?.regAddress || '';
  const gstin = settings?.gstin || '';
  const udyamNo = settings?.udyamNo || 'UDYAM-WB-10-0009130 (Medium)';

  const numberToWords = (num) => {
    // Basic implementation for preview
    return `INR ${num.toLocaleString('en-IN')} Only`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-8 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="relative flex h-full max-h-[95vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl print:h-auto print:max-h-none print:shadow-none">
        
        {/* Header - hidden when printing */}
        <div className="flex items-center justify-between border-b border-slate-100 p-4 print:hidden">
          <h3 className="font-semibold text-lg text-slate-800">Tax Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className="btn-primary text-sm px-4 py-2"
            >
              Print / Save PDF
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible bg-slate-50 print:bg-white">
          <div className="mx-auto w-full max-w-[900px] border border-black bg-white text-black text-[11px] leading-tight print:max-w-none" id="printable-invoice">
            
            {/* Header Block */}
            <div className="flex border-b border-black">
              <div className="w-1/4 p-4 border-r border-black flex items-center justify-center font-bold text-lg">LOGO</div>
              <div className="flex-1 p-2 text-center flex flex-col justify-center">
                <h1 className="text-lg font-bold">TAX INVOICE & DELIVERY CHALLAN</h1>
                <div className="text-sm font-medium">Original for Recipient</div>
              </div>
              <div className="w-1/4 p-2 border-l border-black">
                <div className="text-[10px]">e-Invoice No.</div>
                <div className="mt-4 border-b border-black h-4 w-full"></div>
              </div>
            </div>

            {/* IRN / Ack Block */}
            <div className="flex border-b border-black">
              <div className="flex-1 p-2 space-y-1">
                <div><span className="font-bold">IRN :</span> 4d5a6f72c0110994373cdd1bddb9e0645e66fbda3d74-825b04fd67089a9a37ef</div>
                <div><span className="font-bold">Ack No :</span> 182519105144093</div>
                <div><span className="font-bold">Ack Date :</span> {invoiceDate}</div>
              </div>
              <div className="w-1/4 border-l border-black p-2 text-center">
                <div className="font-bold">QR Code</div>
                <div className="text-[9px]">(e-Invoice)</div>
                <div className="mx-auto mt-1 w-12 h-12 bg-slate-100 flex items-center justify-center text-[8px] text-slate-400">QR</div>
              </div>
            </div>

            {/* Supplier & Metadata Block */}
            <div className="flex border-b border-black">
              <div className="w-7/12 p-2 border-r border-black space-y-1">
                <div className="font-bold text-[9px] uppercase">Supplier (Your Company)</div>
                <div className="font-bold text-sm uppercase">{companyName}</div>
                <div>Reg Address: {regAddress || 'Punitata, India'}</div>
                <div>UDYAM Reg No. : {udyamNo}</div>
                <div>GSTIN Name: {companyName}, Code : 14</div>
                <div><span className="font-bold">GSTIN:</span> {gstin}</div>
                <div>E-mail : {settings?.email || ''}</div>
              </div>
              <div className="w-5/12 text-[10px]">
                <div className="grid grid-cols-2">
                  <div className="border-b border-r border-black p-1 h-10">
                    <div className="text-[9px]">Invoice/Challan No:</div>
                    <div className="font-bold text-xs">{invoice.invoiceNumber}</div>
                  </div>
                  <div className="border-b border-black p-1 h-10">
                    <div className="text-[9px]">Dated:</div>
                    <div className="font-bold text-xs">{invoiceDate}</div>
                  </div>
                  <div className="border-b border-r border-black p-1 h-8">Delivery Note:</div>
                  <div className="border-b border-black p-1 h-8">Mode/Terms of Payment:</div>
                  <div className="border-b border-r border-black p-1 h-10">
                    <div className="text-[9px]">Reference No. & Date:</div>
                    <div className="font-bold">{invoice.invoiceNumber}</div>
                  </div>
                  <div className="border-b border-black p-1 h-10">Other References:</div>
                  <div className="border-b border-r border-black p-1 h-8">Buyer's Order No.</div>
                  <div className="border-b border-black p-1 h-8">Dated</div>
                  <div className="border-b border-r border-black p-1 h-10">
                    <div className="text-[9px]">Dispatch Doc No.</div>
                    <div className="font-bold">{dispatch?.dispatchNumber}</div>
                  </div>
                  <div className="border-b border-black p-1 h-10">Delivery Note Date</div>
                  <div className="border-r border-black p-1 h-10">
                    <div className="text-[9px]">Dispatched through</div>
                    <div className="font-bold">RAJARHAT PLANT</div>
                  </div>
                  <div className="p-1 h-10">
                    <div className="text-[9px]">Destination</div>
                    <div className="font-bold">NEWTOWN</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Consignee, Buyer & Terms of Delivery Block */}
            <div className="flex border-b border-black">
              <div className="w-7/12 flex flex-col">
                <div className="border-b border-r border-black p-2 h-24 space-y-1">
                  <div className="font-bold text-[9px] uppercase">Consignee (Ship-To)</div>
                  <div className="font-bold text-xs uppercase">{client?.clientName}</div>
                  <div>Site: {dispatch?.site?.siteName}</div>
                  <div className="text-[10px]">{dispatch?.site?.address}</div>
                  <div className="font-bold pt-1">GSTIN/ UIN : {client?.gstin}</div>
                </div>
                <div className="border-r border-black p-2 h-32 space-y-1">
                  <div className="font-bold text-[9px] uppercase">Buyer (Bill-To)</div>
                  <div className="font-bold text-xs uppercase">{client?.clientName}</div>
                  <div className="text-[10px]">{client?.officeAddress}</div>
                  <div>Phone: {client?.phone}</div>
                  <div className="font-bold pt-1">GSTIN/ UIN : {client?.gstin}</div>
                  <div className="font-bold pt-1">Place of Supply : West Bengal</div>
                </div>
              </div>
              <div className="w-5/12 flex flex-col">
                <div className="p-2 flex-1">
                  <div className="text-[10px] mb-2">Terms of Delivery</div>
                  <div className="font-bold space-y-1">
                    <div>Dispatched through (e.g., PLANT)</div>
                    <div>Destination (e.g., NEWTOWN SITE)</div>
                    <div className="pt-2">Vehicle No: {dispatch?.vehicleNumber}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-black">
                  <div className="border-b border-r border-black p-1 h-10">Time In</div>
                  <div className="border-b border-black p-1 h-10">Time In</div>
                  <div className="border-r border-black p-1 h-10">Time out</div>
                  <div className="p-1 h-10">Time out</div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold text-center h-8">
                    <td className="border-r border-black w-8"># No</td>
                    <td className="border-r border-black px-2">Description of Goods</td>
                    <td className="border-r border-black w-24">HSN/SAC Code</td>
                    <td className="border-r border-black w-12">Unit</td>
                    <td className="border-r border-black w-16">Quantity</td>
                    <td className="border-r border-black w-20">Rate per Unit</td>
                    <td className="w-24 px-2">Amount</td>
                  </tr>
                </thead>
                <tbody className="h-24">
                  <tr className="border-b border-black align-top text-center h-24">
                    <td className="border-r border-black p-1">1</td>
                    <td className="border-r border-black p-1 text-left font-medium">{grade?.gradeCode}</td>
                    <td className="border-r border-black p-1">{grade?.hsnCode || '38245010'}</td>
                    <td className="border-r border-black p-1">M³</td>
                    <td className="border-r border-black p-1">{quantity.toFixed(2)}</td>
                    <td className="border-r border-black p-1">{rate.toFixed(2)}</td>
                    <td className="p-1 text-right">{amount.toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="h-6">
                    <td colSpan="6" className="border-r border-black text-right pr-2">Output CGST</td>
                    <td className="border-b border-black text-right pr-2">{cgst.toFixed(2)}</td>
                  </tr>
                  <tr className="h-6">
                    <td colSpan="6" className="border-r border-black text-right pr-2">Output SGST</td>
                    <td className="border-b border-black text-right pr-2">{sgst.toFixed(2)}</td>
                  </tr>
                  <tr className="h-6">
                    <td colSpan="6" className="border-r border-black text-right pr-2">Round Off</td>
                    <td className="border-b border-black text-right pr-2">0.00</td>
                  </tr>
                  <tr className="h-8 border-b border-black bg-slate-50 font-bold">
                    <td colSpan="4" className="border-r border-black text-right pr-2">Total</td>
                    <td className="border-r border-black text-center">{quantity.toFixed(2)}</td>
                    <td className="border-r border-black"></td>
                    <td className="text-right pr-2">{total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Tax Summary Table */}
            <div className="w-full">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="border-b border-black h-8 font-bold">
                    <td className="border-r border-black">HSN/SAC</td>
                    <td className="border-r border-black">Taxable Value</td>
                    <td className="border-r border-black">Output CGST (Rate/Amount)</td>
                    <td className="border-r border-black">Output SGST (Rate/Amount)</td>
                    <td>Total Tax Amount</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black h-8">
                    <td className="border-r border-black">{grade?.hsnCode || '38245010'}</td>
                    <td className="border-r border-black">{amount.toFixed(2)}</td>
                    <td className="border-r border-black">9%  {cgst.toFixed(2)}</td>
                    <td className="border-r border-black">9%  {sgst.toFixed(2)}</td>
                    <td>{(cgst + sgst).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Words Blocks */}
            <div className="p-2 border-b border-black">
              <div className="font-bold uppercase text-[9px]">Amount Chargeable (in words):</div>
              <div className="font-medium pt-1">{numberToWords(total)}</div>
            </div>
            <div className="p-2 border-b border-black">
              <div className="font-bold uppercase text-[9px]">Tax Amount (in words):</div>
              <div className="font-medium pt-1">{numberToWords(cgst + sgst)}</div>
            </div>

            {/* Declaration & Signatures */}
            <div className="flex h-40">
              <div className="flex-1 p-2 border-r border-black space-y-4">
                <div>
                  <div className="font-bold underline text-[9px]">Declaration:</div>
                  <div className="text-[10px] mt-1 italic">We declare that this invoice show the actual price of the goods described and that all particulars are true and correct.</div>
                  <div className="mt-2"><span className="font-bold">Company's PAN :</span> {settings?.pan || ''}</div>
                </div>
                <div>
                  <div className="font-bold underline text-[9px]">Terms & Conditions:</div>
                  <ul className="list-disc list-inside text-[9px] mt-1 space-y-0.5">
                    <li>Goods once sold will not be taken back.</li>
                    <li>Interest @ 18% p.a. will be charged if payment is not made within due date.</li>
                    <li>Subject to local jurisdiction.</li>
                  </ul>
                </div>
              </div>
              <div className="w-1/2 flex flex-col justify-between p-4">
                <div className="flex justify-center items-center h-16 border-b border-black mb-4">
                  <div className="text-slate-200 text-3xl font-bold opacity-20">STAMP AREA</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-bold uppercase">for {companyName}</div>
                  <div className="pt-8 font-bold">(Authorized Signatory)</div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Details */}
            <div className="grid grid-cols-3 border-t border-black h-20 text-[9px]">
              <div className="border-r border-black p-2 flex flex-col justify-between">
                <div className="font-bold">Dispatch Details</div>
                <div className="space-y-1">
                  <div>Dispatch approved by: ________________</div>
                  <div>Challan generated by: ________________</div>
                </div>
              </div>
              <div className="border-r border-black p-2"></div>
              <div className="p-2 flex flex-col justify-between">
                <div className="font-bold">Receipt Details</div>
                <div className="space-y-1">
                  <div>Received by: ________________________</div>
                  <div>Name: ____________________________</div>
                  <div>Designation: _______________________</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center text-[10px] text-slate-500 italic print:mt-2">
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
            margin: 0.5cm;
            size: A4 portrait;
          }
        }
      `}</style>
    </div>
  );
}

