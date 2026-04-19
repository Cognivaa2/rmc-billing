import mongoose from 'mongoose';

const batchsheetSchema = new mongoose.Schema(
  {
    dispatch: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchForm', required: true, index: true },
    template: { type: mongoose.Schema.Types.ObjectId, ref: 'BatchsheetTemplate' },
    isCustom: { type: Boolean, default: false },
    mixDesignData: { type: Object, required: true },
    pdfUrl: String,
    generatedByLevel4: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Batchsheet = mongoose.model('Batchsheet', batchsheetSchema);
