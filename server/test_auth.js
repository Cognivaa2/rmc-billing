import mongoose from 'mongoose';
import { Order } from './src/models/Order.js';
import { SalesOrder } from './src/models/SalesOrder.js';
import { DispatchForm } from './src/models/DispatchForm.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rmcbilling');
  const order = await Order.findOne({ orderNumber: 'ORD-2026-00002' });
  console.log('Order:', order._id, order.status);
  
  const sos = await SalesOrder.find({ sourceOrder: order._id });
  console.log('SOs:', sos.map(s => s._id));
  
  const dispatches = await DispatchForm.find({ 
    $or: [{ order: order._id }, { salesOrder: { $in: sos.map((s) => s._id) } }] 
  });
  console.log('Dispatches found:', dispatches.map(d => ({ id: d.dispatchNumber, status: d.status, so: d.salesOrder, ord: d.order })));
  
  process.exit(0);
}
run();
