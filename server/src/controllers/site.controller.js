import { z } from 'zod';
import { Site } from '../models/Site.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const siteSchema = z.object({
  client: z.string(),
  siteName: z.string().min(1),
  siteAddress: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
});

export const listSites = asyncHandler(async (req, res) => {
  const { client, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (client) filter.client = client;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Site.countDocuments(filter);
  const sites = await Site.find(filter)
    .populate('client', 'clientName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({
    sites,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

export const createSite = asyncHandler(async (req, res) => {
  const site = await Site.create(req.body);
  res.status(201).json({ site });
});

export const updateSite = asyncHandler(async (req, res) => {
  const site = await Site.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!site) throw ApiError.notFound();
  res.json({ site });
});

export const deleteSite = asyncHandler(async (req, res) => {
  throw ApiError.forbidden('Sites are tied to client master; deletion is not permitted');
});
