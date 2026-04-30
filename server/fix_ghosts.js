import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DispatchForm } from './src/models/DispatchForm.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find dispatches for DSP-2026-00001 and DSP-2026-00002
  const d1 = await DispatchForm.findOne({ dispatchNumber: 'DSP-2026-00001' });
  const d2 = await DispatchForm.findOne({ dispatchNumber: 'DSP-2026-00002' });
  const d3 = await DispatchForm.findOne({ dispatchNumber: 'DSP-2026-00003' });

  console.log("Before:");
  if (d1) console.log("DSP-1 status:", d1.status);
  if (d2) console.log("DSP-2 status:", d2.status);
  if (d3) console.log("DSP-3 status:", d3.status);

  // If they are 'dispatched', let's manually change DSP-1 and DSP-2 to 'sale_authorized'
  // so the user only sees the current one (DSP-3).
  if (d1 && d1.status === 'dispatched') {
    d1.status = 'sale_authorized';
    await d1.save();
  }
  if (d2 && d2.status === 'dispatched') {
    d2.status = 'sale_authorized';
    await d2.save();
  }

  console.log("After fixing ghosts:");
  const d1_after = await DispatchForm.findOne({ dispatchNumber: 'DSP-2026-00001' });
  const d2_after = await DispatchForm.findOne({ dispatchNumber: 'DSP-2026-00002' });
  if (d1_after) console.log("DSP-1 status:", d1_after.status);
  if (d2_after) console.log("DSP-2 status:", d2_after.status);

  process.exit(0);
}
run();
