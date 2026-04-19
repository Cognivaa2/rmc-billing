import { z } from 'zod';
import { BatchsheetTemplate } from '../models/BatchsheetTemplate.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const templateSchema = z.object({
  templateName: z.string().min(2),
  type: z.enum(['preset', 'custom']).default('preset'),
  layoutJson: z.record(z.any()),
  mixDesignFields: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const listTemplates = asyncHandler(async (req, res) => {
  const templates = await BatchsheetTemplate.find().sort({ createdAt: -1 });
  res.json({ templates });
});

export const getTemplate = asyncHandler(async (req, res) => {
  const template = await BatchsheetTemplate.findById(req.params.id);
  if (!template) throw ApiError.notFound();
  res.json({ template });
});

export const createTemplate = asyncHandler(async (req, res) => {
  const template = await BatchsheetTemplate.create({
    ...req.body,
    createdByLevel4: req.user.id,
  });
  res.status(201).json({ template });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await BatchsheetTemplate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!template) throw ApiError.notFound();
  res.json({ template });
});

export const deactivateTemplate = asyncHandler(async (req, res) => {
  const template = await BatchsheetTemplate.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );
  if (!template) throw ApiError.notFound();
  res.json({ template });
});
