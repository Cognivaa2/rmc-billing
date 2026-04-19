import { z } from 'zod';
import { ConcreteGrade } from '../models/ConcreteGrade.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const gradeSchema = z.object({
  gradeCode: z.string().min(1).max(16),
  description: z.string().optional(),
  defaultMixDesign: z.record(z.any()).optional(),
});

export const listGrades = asyncHandler(async (req, res) => {
  const grades = await ConcreteGrade.find().sort({ gradeCode: 1 });
  res.json({ grades });
});

export const createGrade = asyncHandler(async (req, res) => {
  const grade = await ConcreteGrade.create(req.body);
  res.status(201).json({ grade });
});

export const updateGrade = asyncHandler(async (req, res) => {
  const grade = await ConcreteGrade.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!grade) throw ApiError.notFound();
  res.json({ grade });
});
