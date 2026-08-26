import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AcademicDocument } from '../models/document.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';

export async function getDocuments(req: Request, res: Response): Promise<void> {
  try {
    const { documentType, department, program, semester, academicYear, status, search } = req.query;
    const filter: Record<string, unknown> = {};

    if (documentType) filter.documentType = documentType;
    if (department) filter.department = department;
    if (program) filter.program = program;
    if (semester) filter.semester = Number(semester);
    if (academicYear) filter.academicYear = academicYear;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalFileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(String(search), 'i')] } },
      ];
    }

    const documents = await AcademicDocument.find(filter)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });

    sendSuccess(res, documents, 'Documents retrieved successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch documents';
    sendError(res, errMessage, 500);
  }
}

export async function getDocumentById(req: Request, res: Response): Promise<void> {
  try {
    const doc = await AcademicDocument.findById(req.params.id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .populate('uploadedBy', 'name email role');

    if (!doc) {
      sendError(res, 'Document not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, doc);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch document';
    sendError(res, errMessage, 500);
  }
}

export async function uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 'File is required for upload', 400, 'FILE_REQUIRED');
      return;
    }

    const {
      title,
      documentType,
      department,
      program,
      semester,
      academicYear,
      version,
      tags,
      description,
    } = req.body;

    if (!title || !documentType) {
      // Cleanup uploaded file on validation error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      sendError(res, 'Title and documentType are required', 400, 'VALIDATION_ERROR');
      return;
    }

    let parsedTags: string[] = [];
    if (tags) {
      parsedTags = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
    }

    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    const documentRecord = new AcademicDocument({
      title: title.trim(),
      documentType,
      department: department || null,
      program: program || null,
      semester: semester ? Number(semester) : null,
      academicYear: academicYear || '2025-26',
      version: version || '1.0',
      status: 'uploaded',
      originalFileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageReference: relativePath,
      uploadedBy: req.user?.id,
      tags: parsedTags,
      description: description?.trim() || '',
    });

    await documentRecord.save();
    const populated = await AcademicDocument.findById(documentRecord._id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .populate('uploadedBy', 'name email role');

    sendSuccess(res, populated, 'Document uploaded and registered successfully', 201);
  } catch (error: unknown) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const errMessage = error instanceof Error ? error.message : 'Failed to upload document';
    sendError(res, errMessage, 500);
  }
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  try {
    const doc = await AcademicDocument.findById(req.params.id);
    if (!doc) {
      sendError(res, 'Document not found', 404, 'NOT_FOUND');
      return;
    }

    // Attempt to unlink physical file if exists
    const absolutePath = path.resolve(process.cwd(), doc.storageReference);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch {
        // Log and continue deletion of metadata
      }
    }

    await AcademicDocument.findByIdAndDelete(req.params.id);
    sendSuccess(res, { id: req.params.id }, 'Document and file deleted successfully');
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to delete document';
    sendError(res, errMessage, 500);
  }
}

export async function downloadDocument(req: Request, res: Response): Promise<void> {
  try {
    const doc = await AcademicDocument.findById(req.params.id);
    if (!doc) {
      sendError(res, 'Document not found', 404, 'NOT_FOUND');
      return;
    }

    const absolutePath = path.resolve(process.cwd(), doc.storageReference);
    if (!fs.existsSync(absolutePath)) {
      sendError(res, 'Physical file not found on server storage', 404, 'FILE_NOT_FOUND');
      return;
    }

    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalFileName)}"`);
    res.setHeader('Content-Type', doc.mimeType);
    res.sendFile(absolutePath);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to download document';
    sendError(res, errMessage, 500);
  }
}
