import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema(
  {
    templateName: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['preset', 'custom'], default: 'preset' },
    layoutJson: { type: Object, required: true },
    mixDesignFields: { type: [String], default: [] },
    createdByLevel4: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const BatchsheetTemplate = mongoose.model('BatchsheetTemplate', templateSchema);
