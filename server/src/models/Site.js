import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    siteName: { type: String, required: true, trim: true },
    siteAddress: String,
    contactPerson: String,
    contactNumber: String,
  },
  { timestamps: true },
);

export const Site = mongoose.model('Site', siteSchema);
