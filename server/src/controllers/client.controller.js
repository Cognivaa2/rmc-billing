import { z } from 'zod';
import { Client } from '../models/Client.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { notifyLevels } from '../services/notification.service.js';

export const createClientSchema = z.object({
  clientName: z.string().min(2),
  officeAddress: z.string().min(2),
  contactNumber: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  taxInformation: z
    .object({ gstin: z.string().optional(), pan: z.string().optional(), otherTaxId: z.string().optional() })
    .optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const kycSchema = z.object({
  kycStatus: z.enum(['pending', 'submitted', 'verified', 'rejected']).optional(),
  remarks: z.string().optional(),
  documents: z
    .array(z.object({ fileName: z.string(), fileUrl: z.string(), uploadedAt: z.string().optional() }))
    .optional(),
  creditStatus: z.enum(['good', 'hold', 'blocked']).optional(),
});

export const listClients = asyncHandler(async (req, res) => {
  const { q, kycStatus, creditStatus, page, limit } = req.query;
  const filter = {};
  if (q) filter.clientName = new RegExp(q, 'i');
  if (kycStatus) filter.kycStatus = kycStatus;
  if (creditStatus) filter.creditStatus = creditStatus;

  let query = Client.find(filter).sort({ createdAt: -1 });
  let total = await Client.countDocuments(filter);
  let totalPages = 1;
  let currentPage = 1;

  if (page || limit) {
    currentPage = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 6;
    const skip = (currentPage - 1) * limitNum;
    query = query.skip(skip).limit(limitNum);
    totalPages = Math.ceil(total / limitNum);
  }

  const clients = await query;
  res.json({ clients, total, page: currentPage, totalPages });
});

export const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id).populate('kycData.verifiedBy', 'name');
  if (!client) throw ApiError.notFound('Client not found');
  res.json({ client });
});

export const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...req.body, createdByLevel3: req.user.id });
  res.status(201).json({ client });
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!client) throw ApiError.notFound();
  res.json({ client });
});

export const updateKyc = asyncHandler(async (req, res) => {
  const { kycStatus, remarks, documents, creditStatus } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) throw ApiError.notFound();

  if (kycStatus) client.kycStatus = kycStatus;
  if (remarks !== undefined) client.kycData.remarks = remarks;
  if (Array.isArray(documents)) client.kycData.documents = documents;
  if (creditStatus) client.creditStatus = creditStatus;

  // Always log who made the last change to the KYC/Credit profile
  client.kycData.verifiedBy = req.user.id;
  client.kycData.verifiedAt = new Date();

  await client.save();
  await notifyLevels([2], {
    type: 'kyc_update',
    message: `KYC updated for ${client.clientName} (${client.kycStatus})`,
    relatedEntity: { kind: 'Client', id: client._id },
  });
  res.json({ client });
});

// Explicit block: per brief, client master records can never be deleted.
export const deleteClient = asyncHandler(async (req, res) => {
  throw ApiError.forbidden('Client master records cannot be deleted');
});
