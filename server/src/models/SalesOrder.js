import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema(
  {
    soNumber: { type: String, required: true, unique: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    grade: { type: mongoose.Schema.Types.ObjectId, ref: 'ConcreteGrade', required: true },
    rate: { type: Number, required: true, min: 0 },
    totalQuantity: { type: Number, required: true, min: 0 },
    dispatchedQuantity: { type: Number, default: 0, min: 0 },
    remainingQuantity: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    createdByLevel2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    closedByLevel2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedAt: Date,
    notes: String,
  },
  { timestamps: true },
);

export const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
