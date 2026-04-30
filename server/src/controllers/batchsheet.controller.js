import { z } from 'zod';
import { Batchsheet } from '../models/Batchsheet.js';
import { BatchsheetTemplate } from '../models/BatchsheetTemplate.js';
import { DispatchForm } from '../models/DispatchForm.js';
import { Client } from '../models/Client.js';
import { ConcreteGrade } from '../models/ConcreteGrade.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { renderBatchsheetPdf } from '../pdf/batchsheetPdf.js';

export const createBatchsheetSchema = z.object({
  dispatch: z.string(),
  template: z.string().optional(),
  isCustom: z.boolean().optional(),
  mixDesignData: z.record(z.any()),
});

export const listBatchsheets = asyncHandler(async (req, res) => {
  const { dispatch } = req.query;
  const filter = {};
  if (dispatch) filter.dispatch = dispatch;
  const batchsheets = await Batchsheet.find(filter)
    .populate({ path: 'dispatch', populate: { path: 'client grade' } })
    .populate('template', 'templateName type')
    .populate('generatedByLevel4', 'name')
    .sort({ createdAt: -1 });
  res.json({ batchsheets });
});

export const createBatchsheet = asyncHandler(async (req, res) => {
  const dispatch = await DispatchForm.findById(req.body.dispatch).populate('salesOrder');
  if (!dispatch) throw ApiError.notFound('Dispatch not found');

  // Enforce Workflow: Batchsheet requires the dispatch to be sale_authorized
  if (dispatch.status === 'dispatched') {
    throw ApiError.badRequest('Batchsheets can only be generated after the sale is AUTHORIZED by Level 2.');
  }

  const batchsheet = await Batchsheet.create({
    ...req.body,
    generatedByLevel4: req.user.id,
  });

  if (dispatch.status === 'sale_authorized') {
    dispatch.status = 'batchsheet';
    await dispatch.save();
  }

  res.status(201).json({ batchsheet });
});

export const updateBatchsheetSchema = z.object({
  mixDesignData: z.record(z.any()),
});

export const updateBatchsheet = asyncHandler(async (req, res) => {
  const batchsheet = await Batchsheet.findById(req.params.id).populate({
    path: 'dispatch',
    populate: { path: 'salesOrder' }
  });
  if (!batchsheet) throw ApiError.notFound();

  // Enforce Workflow on update as well
  const dispatch = batchsheet.dispatch;
  if (dispatch && dispatch.status === 'dispatched') {
    throw ApiError.badRequest('Batchsheet values can only be filled/updated after the sale is AUTHORIZED by Level 2.');
  }
  
  // Update mixDesignData
  batchsheet.mixDesignData = {
    ...batchsheet.mixDesignData,
    ...req.body.mixDesignData,
  };
  
  await batchsheet.save();
  res.json({ batchsheet });
});

export const getBatchsheetPdf = asyncHandler(async (req, res) => {
  const batchsheet = await Batchsheet.findById(req.params.id).populate('template');
  if (!batchsheet) throw ApiError.notFound();
  const dispatch = await DispatchForm.findById(batchsheet.dispatch)
    .populate('order site client grade');
  const client = dispatch.client;
  const grade = dispatch.grade;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="batchsheet-${dispatch.dispatchNumber}.pdf"`,
  );
  renderBatchsheetPdf(res, {
    dispatch,
    client,
    grade,
    batchsheet,
    template: batchsheet.template,
  });
});
