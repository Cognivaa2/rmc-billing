import mongoose from 'mongoose';

const kycDocSchema = new mongoose.Schema(
  {
    fileName: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const clientSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true, trim: true, index: true },
    officeAddress: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: String,
    taxInformation: {
      gstin: String,
      pan: String,
      otherTaxId: String,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'submitted', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    kycData: {
      documents: [kycDocSchema],
      remarks: String,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
    },
    creditStatus: {
      type: String,
      enum: ['good', 'hold', 'blocked'],
      default: 'good',
      index: true,
    },
    createdByLevel3: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeletable: { type: Boolean, default: false, immutable: true },
  },
  { timestamps: true },
);

// HARD GUARD: client master is permanent. Per brief, not deletable under any circumstance.
function blockDelete() {
  throw Object.assign(new Error('Client master records cannot be deleted'), { status: 403 });
}
clientSchema.pre('deleteOne', { document: true, query: false }, blockDelete);
clientSchema.pre('deleteOne', { document: false, query: true }, blockDelete);
clientSchema.pre('findOneAndDelete', blockDelete);
clientSchema.pre('deleteMany', blockDelete);
clientSchema.pre('remove', blockDelete);

export const Client = mongoose.model('Client', clientSchema);
