import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { AcademicDocument, IDocument } from '../../../models/document.model';
import { KnowledgeChunk } from '../../../models/knowledge-chunk.model';
import { pdfExtractorService } from './pdf-extractor.service';
import { metadataExtractorService } from './metadata-extractor.service';
import { chunkingService } from './chunking.service';
import { embeddingService } from './embedding.service';

export interface IngestionResult {
  documentId: string;
  status: 'ready' | 'failed';
  totalPages: number;
  totalChunks: number;
  error?: string;
}

export class DocumentIngestionService {
  /**
   * Processes an uploaded PDF document through the end-to-end RAG ingestion pipeline:
   * PDF text extraction -> Document understanding -> Chunking -> Gemini embeddings -> Storage -> Ready
   */
  public async processDocument(documentId: string | mongoose.Types.ObjectId): Promise<IngestionResult> {
    const doc = await AcademicDocument.findById(documentId);
    if (!doc) {
      throw new Error(`Document record not found for ID: ${documentId}`);
    }

    // Step 1: Update status to 'processing'
    doc.status = 'processing';
    doc.processingError = undefined;
    await doc.save();

    try {
      // Step 2: Validate physical file existence
      const absolutePath = path.isAbsolute(doc.storageReference)
        ? doc.storageReference
        : path.resolve(process.cwd(), doc.storageReference);

      if (!fs.existsSync(absolutePath)) {
        throw new Error('Physical document file is not found on storage');
      }

      // Step 3: Extract PDF text preserving page boundaries
      const fileBuffer = fs.readFileSync(absolutePath);
      const extraction = await pdfExtractorService.extractFromBuffer(fileBuffer);

      if (!extraction.fullText || extraction.fullText.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text');
      }

      // Step 4: Analyze document structure & extract metadata
      const docMetadata = metadataExtractorService.extractDocumentMetadata(extraction.fullText);

      // Step 5: Chunk text preserving page boundaries and attaching immutable admin context
      const adminContext = {
        department: doc.department,
        program: doc.program,
      };

      const preparedChunks = chunkingService.chunkPages(
        extraction.pages,
        docMetadata,
        adminContext
      );

      if (preparedChunks.length === 0) {
        throw new Error('Document produced no valid text chunks');
      }

      // Step 6: Generate Gemini embeddings in batch
      const chunkTexts = preparedChunks.map((c) => c.text);
      const embeddings = await embeddingService.embedDocuments(chunkTexts);

      if (embeddings.length !== preparedChunks.length) {
        throw new Error(
          `Embedding generation mismatch: generated ${embeddings.length} embeddings for ${preparedChunks.length} chunks`
        );
      }

      // Step 7: Clear any existing chunks for this document to ensure clean re-ingestion
      await KnowledgeChunk.deleteMany({ documentId: doc._id });

      // Step 8: Bulk insert knowledge chunks into MongoDB
      const chunkDocs = preparedChunks.map((chunk, idx) => ({
        documentId: doc._id,
        text: chunk.text,
        embedding: embeddings[idx],
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber,
        metadata: chunk.metadata,
      }));

      await KnowledgeChunk.insertMany(chunkDocs);

      // Step 9: Update document record to 'ready' status
      doc.status = 'ready';
      doc.totalPages = extraction.totalPages;
      doc.totalChunks = preparedChunks.length;
      doc.processedAt = new Date();

      if (docMetadata.semester && !doc.semester) {
        doc.semester = docMetadata.semester;
      }
      if (docMetadata.academicYear && doc.academicYear === '2025-26') {
        doc.academicYear = docMetadata.academicYear;
      }
      if (docMetadata.documentType && (!doc.documentType || doc.documentType === 'general_academic')) {
        doc.documentType = docMetadata.documentType as any;
      }

      await doc.save();

      return {
        documentId: doc._id.toString(),
        status: 'ready',
        totalPages: extraction.totalPages,
        totalChunks: preparedChunks.length,
      };
    } catch (err: unknown) {
      // Step 10: Safe failure handling
      const safeError = err instanceof Error ? err.message : 'An error occurred while processing the document';
      
      doc.status = 'failed';
      doc.processingError = safeError;
      await doc.save();

      return {
        documentId: doc._id.toString(),
        status: 'failed',
        totalPages: doc.totalPages || 0,
        totalChunks: doc.totalChunks || 0,
        error: safeError,
      };
    }
  }
}

export const documentIngestionService = new DocumentIngestionService();
