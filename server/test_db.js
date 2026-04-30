import mongoose from 'mongoose';
import { DispatchForm } from './src/models/DispatchForm.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rmcbilling');
  
  const dispatches = await DispatchForm.find({ 
    dispatchNumber: { $in: ['DSP-2026-00001', 'DSP-2026-00002', 'DSP-2026-00003'] } 
  }).populate('order', 'orderNumber').populate('salesOrder', 'soNumber');
  
  for (const d of dispatches) {
    console.log(`${d.dispatchNumber} -> Order: ${d.order?.orderNumber || 'null'}, SO: ${d.salesOrder?.soNumber || 'null'}, Status: ${d.status}`);
  }
  
  process.exit(0);
}
run();
