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
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\d{10}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid 10-digit contact number!`,
      },
    },
    email: String,
    taxInformation: {
      gstin: {
        type: String,
        uppercase: true,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
          },
          message: (props) => `${props.value} is not a valid GST number!`,
        },
      },
      pan: {
        type: String,
        uppercase: true,
        trim: true,
        validate: {
          validator: function (v) {
            if (!v) return true;
            return /^[A-Z]{5}\d{4}[A-Z]$/.test(v);
          },
          message: (props) => `${props.value} is not a valid PAN number!`,
        },
      },
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
