import mongoose from 'mongoose';
import { SalesOrder } from './server/src/models/SalesOrder.js';
import { env } from './server/src/config/env.js';

async function checkSo() {
  await mongoose.connect(env.mongoUri);
  const so = await SalesOrder.findOne({ soNumber: 'SO-2026-00003' });
  console.log('Sales Order:', JSON.stringify(so, null, 2));
  await mongoose.disconnect();
}

checkSo().catch(console.error);
