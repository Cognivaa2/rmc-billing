import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema(
  {
    gradeCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    defaultMixDesign: { type: Object, default: {} },
  },
  { timestamps: true },
);

export const ConcreteGrade = mongoose.model('ConcreteGrade', gradeSchema);
