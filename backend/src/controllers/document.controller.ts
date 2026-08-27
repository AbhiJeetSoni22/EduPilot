import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { AcademicDocument } from '../models/document.model';
import { KnowledgeChunk } from '../models/knowledge-chunk.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { documentIngestionService } from '../services/ai/rag/document-ingestion.service';

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

export async function getDocumentStatus(req: Request, res: Response): Promise<void> {
  try {
    const doc = await AcademicDocument.findById(req.params.id).select(
      'status totalPages totalChunks processingError processedAt title originalFileName'
    );

    if (!doc) {
      sendError(res, 'Document not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, {
      id: doc._id,
      title: doc.title,
      originalFileName: doc.originalFileName,
      status: doc.status,
      totalPages: doc.totalPages || 0,
      totalChunks: doc.totalChunks || 0,
      processingError: doc.processingError || null,
      processedAt: doc.processedAt || null,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Failed to fetch document status';
    sendError(res, errMessage, 500);
  }
}

export async function uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      sendError(res, 'PDF file is required for upload', 400, 'FILE_REQUIRED');
      return;
    }

    const { department, program, title, description, version, academicYear } = req.body;

    if (!department || !program) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      sendError(res, 'Department and Program are required for document ingestion', 400, 'VALIDATION_ERROR');
      return;
    }

    const defaultTitle = title?.trim() || file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

    const documentRecord = new AcademicDocument({
      title: defaultTitle,
      originalFileName: file.originalname,
      department,
      program,
      academicYear: academicYear || '2025-26',
      version: version || '1.0',
      status: 'uploaded',
      fileSize: file.size,
      mimeType: file.mimetype || 'application/pdf',
      storageReference: relativePath,
      uploadedBy: req.user?.id || null,
      description: description?.trim() || '',
    });

    await documentRecord.save();

    // Trigger end-to-end RAG ingestion pipeline
    const ingestionResult = await documentIngestionService.processDocument(documentRecord._id);

    const populated = await AcademicDocument.findById(documentRecord._id)
      .populate('department', 'name code')
      .populate('program', 'name code degreeType')
      .populate('uploadedBy', 'name email role');

    const message =
      ingestionResult.status === 'ready'
        ? `Document processed and indexed successfully (${ingestionResult.totalChunks} chunks generated)`
        : `Document registered, but processing encountered an error: ${ingestionResult.error}`;

    sendSuccess(res, populated, message, 201);
  } catch (error: unknown) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore unlink error
      }
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

    // Delete stored PDF file from filesystem
    const absolutePath = path.resolve(process.cwd(), doc.storageReference);
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch {
        // Log and continue
      }
    }

    // Delete all associated knowledge chunks
    await KnowledgeChunk.deleteMany({ documentId: doc._id });

    // Delete document record
    await AcademicDocument.findByIdAndDelete(req.params.id);

    sendSuccess(res, { id: req.params.id }, 'Document and associated vector chunks deleted successfully');
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
