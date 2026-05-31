import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema(
  {
    dispatchNumber: { type: String, required: true, unique: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site' },
    grade: { type: mongoose.Schema.Types.ObjectId, ref: 'ConcreteGrade', required: true },
    quantity: { type: Number, required: true, min: 0 },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    mixDetails: { type: String },
    driverName: { type: String, trim: true },
    dispatchDateTime: { type: Date, default: Date.now },
    filledByLevel4: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['dispatched', 'sale_authorized', 'invoiced'],
      default: 'dispatched',
      index: true,
    },
  },
  { timestamps: true },
);

export const DispatchForm = mongoose.model('DispatchForm', dispatchSchema);
