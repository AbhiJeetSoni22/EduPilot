import { Request, Response } from 'express';
import { Regulation } from '../models/regulation.model';
import { sendSuccess, sendError } from '../utils/response';

export async function getRegulations(req: Request, res: Response): Promise<void> {
  try {
    const { category, academicYear, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (category) filter.category = category;
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { regulationCode: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const regulations = await Regulation.find(filter).sort({ category: 1, title: 1 });
    sendSuccess(res, regulations, 'Regulations retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch regulations';
    sendError(res, errMessage, 500);
  }
}

export async function getRegulationById(req: Request, res: Response): Promise<void> {
  try {
    const regulation = await Regulation.findById(req.params.id);
    if (!regulation) {
      sendError(res, 'Regulation not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, regulation);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch regulation';
    sendError(res, errMessage, 500);
  }
}

export async function createRegulation(req: Request, res: Response): Promise<void> {
  try {
    const { regulationCode, title, category, academicYear, summary, content, keyRules, status, version } =
      req.body;

    if (!regulationCode || !title || !category || !summary || !content) {
      sendError(res, 'Regulation code, title, category, summary, and content are required', 400, 'VALIDATION_ERROR');
      return;
    }

    const existing = await Regulation.findOne({
      regulationCode: regulationCode.toUpperCase().trim(),
    });
    if (existing) {
      sendError(res, 'A regulation with this code already exists', 409, 'DUPLICATE_CODE');
      return;
    }

    const regulation = new Regulation({
      regulationCode: regulationCode.toUpperCase().trim(),
      title: title.trim(),
      category,
      academicYear: academicYear || '2025-26',
      summary: summary.trim(),
      content: content.trim(),
      keyRules: keyRules || [],
      status: status || 'active',
      version: version || '1.0',
    });

    await regulation.save();
    sendSuccess(res, regulation, 'Regulation created successfully', 201);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to create regulation';
    sendError(res, errMessage, 500);
  }
}

export async function updateRegulation(req: Request, res: Response): Promise<void> {
  try {
    const { regulationCode, title, category, academicYear, summary, content, keyRules, status, version } =
      req.body;

    const regulation = await Regulation.findById(req.params.id);
    if (!regulation) {
      sendError(res, 'Regulation not found', 404, 'NOT_FOUND');
      return;
    }

    if (regulationCode && regulationCode.toUpperCase().trim() !== regulation.regulationCode) {
      const existing = await Regulation.findOne({
        regulationCode: regulationCode.toUpperCase().trim(),
        _id: { $ne: regulation._id },
      });
      if (existing) {
        sendError(res, 'A regulation with this code already exists', 409, 'DUPLICATE_CODE');
        return;
      }
      regulation.regulationCode = regulationCode.toUpperCase().trim();
    }

    if (title) regulation.title = title.trim();
    if (category) regulation.category = category;
    if (academicYear) regulation.academicYear = academicYear;
    if (summary) regulation.summary = summary.trim();
    if (content) regulation.content = content.trim();
    if (keyRules) regulation.keyRules = keyRules;
    if (status) regulation.status = status;
    if (version) regulation.version = version;

    await regulation.save();
    sendSuccess(res, regulation, 'Regulation updated successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to update regulation';
    sendError(res, errMessage, 500);
  }
}

export async function deleteRegulation(req: Request, res: Response): Promise<void> {
  try {
    const regulation = await Regulation.findByIdAndDelete(req.params.id);
    if (!regulation) {
      sendError(res, 'Regulation not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { id: req.params.id }, 'Regulation deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete regulation';
    sendError(res, errMessage, 500);
  }
}
