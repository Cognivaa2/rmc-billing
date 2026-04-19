import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    amount: { type: Number, required: true, min: 0 },
    paymentReceived: { type: Boolean, default: false },
    receivedAt: Date,
    recordedByLevel2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    remarks: String,
  },
  { timestamps: true },
);

export const Payment = mongoose.model('Payment', paymentSchema);
