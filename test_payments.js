import mongoose from 'mongoose';
import { Payment } from './server/src/models/Payment.js';
mongoose.connect('mongodb://localhost:27017/rmc_billing').then(async () => {
  const all = await Payment.find();
  console.log('Total payments:', all.length);
  console.log('Pending payments:', all.filter(p => !p.paymentReceived).length);
  console.log('Received payments:', all.filter(p => p.paymentReceived).length);
  process.exit(0);
});
