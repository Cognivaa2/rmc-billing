import { z } from 'zod';
import { DispatchForm } from '../models/DispatchForm.js';
import { Batchsheet } from '../models/Batchsheet.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { CompanySettings, getOrCreateSettings } from '../models/CompanySettings.js';

export const deleteRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  ids: z.array(z.string()).optional(),
});

export const companySettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  regAddress: z.string().optional(),
  gstin: z.string().optional(),
  dispatchAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  pan: z.string().optional(),
  udyamNo: z.string().optional(),
});

function buildDateFilter({ from, to }) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return range;
}

// Per brief: L1 deletion is limited to dispatch data only.
export const deleteDispatchData = asyncHandler(async (req, res) => {
  const { from, to, ids } = req.body;
  const filter = {};
  if (ids?.length) filter._id = { $in: ids };
  const range = buildDateFilter({ from, to });
  if (range) filter.dispatchDateTime = range;
  const result = await DispatchForm.deleteMany(filter);
  res.json({ deletedCount: result.deletedCount });
});

// Per brief: L1 deletion is limited to batchsheet data only.
export const deleteBatchsheetData = asyncHandler(async (req, res) => {
  const { from, to, ids } = req.body;
  const filter = {};
  if (ids?.length) filter._id = { $in: ids };
  const range = buildDateFilter({ from, to });
  if (range) filter.generatedAt = range;
  const result = await Batchsheet.deleteMany(filter);
  res.json({ deletedCount: result.deletedCount });
});

// Company settings — read by all authenticated users (needed for PDF generation)
export const getCompanySettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json({ settings });
});

// Company settings — update restricted to L1 only
export const updateCompanySettings = asyncHandler(async (req, res) => {
  let settings = await getOrCreateSettings();
  Object.assign(settings, req.body);
  await settings.save();
  res.json({ settings });
});

