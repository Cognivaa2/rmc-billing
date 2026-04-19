import mongoose from 'mongoose';

// Singleton document — only ever one record in the collection
const companySettingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'COMPANY NAME' },
    regAddress: { type: String, default: '' },
    gstin: { type: String, default: '' },
    dispatchAddress: { type: String, default: '' },
    // Contact info for PDF headers
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { timestamps: true },
);

export const CompanySettings = mongoose.model('CompanySettings', companySettingsSchema);

/** Returns the single company settings document, creating it with defaults if missing */
export async function getOrCreateSettings() {
  let doc = await CompanySettings.findOne();
  if (!doc) doc = await CompanySettings.create({});
  return doc;
}
