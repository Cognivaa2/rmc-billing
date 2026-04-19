import mongoose from 'mongoose';

const invoiceBlockSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    financialYear: { type: String, required: true, index: true },
    rangeStart: { type: Number, required: true },
    rangeEnd: { type: Number, required: true },
    usedNumbers: { type: [Number], default: [] },
    status: {
      type: String,
      enum: ['active', 'exhausted', 'expired'],
      default: 'active',
      index: true,
    },
    reservedAt: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: true },
);

invoiceBlockSchema.methods.nextAvailable = function nextAvailable() {
  const used = new Set(this.usedNumbers);
  for (let n = this.rangeStart; n <= this.rangeEnd; n += 1) {
    if (!used.has(n)) return n;
  }
  return null;
};

export const InvoiceNumberBlock = mongoose.model('InvoiceNumberBlock', invoiceBlockSchema);
