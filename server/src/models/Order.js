import mongoose from 'mongoose';

export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DISPATCHED: 'DISPATCHED',
  SALE_AUTHORIZED: 'SALE_AUTHORIZED',
  INVOICED: 'INVOICED',
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    salesOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    grade: { type: mongoose.Schema.Types.ObjectId, ref: 'ConcreteGrade', required: true },
    quantity: { type: Number, required: true, min: 0 },
    negotiatedRate: { type: Number, required: true, min: 0 },
    deliveryDate: Date,
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    createdByLevel3: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedByLevel2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    saleAuthorizedByLevel2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    saleAuthorizedAt: Date,
    remarks: String,
  },
  { timestamps: true },
);

export const Order = mongoose.model('Order', orderSchema);
