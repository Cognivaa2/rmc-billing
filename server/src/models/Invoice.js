import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    dispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchForm', index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    grade: { type: mongoose.Schema.Types.ObjectId, ref: 'ConcreteGrade', index: true },
    gradeLabel: { type: String },  // fallback plain-text grade (e.g. "M30") when no grade doc exists
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    showRateOnInvoice: { type: Boolean, default: true },
    vehicleNumber: { type: String },
    generatedByLevel4: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now },
    pdfUrl: String,
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    syncStatus: { type: String, enum: ['synced', 'pending_sync'], default: 'synced' },
    generatedOffline: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
