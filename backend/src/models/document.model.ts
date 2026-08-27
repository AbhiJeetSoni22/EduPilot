import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export type DocumentType =
  | 'academic_regulations'
  | 'examination_rules'
  | 'attendance_policy'
  | 'grading_policy'
  | 'syllabus'
  | 'student_handbook'
  | 'academic_circular'
  | 'curriculum'
  | 'general_academic';

export type DocumentStatus = 'uploaded' | 'processing' | 'ready' | 'processed' | 'failed' | 'archived';

export interface IDocument extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  originalFileName: string;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  semester?: number;
  academicYear?: string;
  documentType?: DocumentType;
  version: string;
  status: DocumentStatus;
  processingError?: string;
  totalPages?: number;
  totalChunks?: number;
  isActive: boolean;
  fileSize: number;
  mimeType: string;
  storageReference: string;
  uploadedBy?: mongoose.Types.ObjectId;
  tags: string[];
  description?: string;
  uploadedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentModelSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program is required'],
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    academicYear: {
      type: String,
      default: '2025-26',
      trim: true,
    },
    documentType: {
      type: String,
      enum: [
        'academic_regulations',
        'examination_rules',
        'attendance_policy',
        'grading_policy',
        'syllabus',
        'student_handbook',
        'academic_circular',
        'curriculum',
        'general_academic',
      ],
      default: 'general_academic',
    },
    version: {
      type: String,
      default: '1.0',
      trim: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'ready', 'processed', 'failed', 'archived'],
      default: 'uploaded',
    },
    processingError: {
      type: String,
      default: null,
    },
    totalPages: {
      type: Number,
      default: 0,
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      default: 'application/pdf',
    },
    storageReference: {
      type: String,
      required: [true, 'Storage reference is required'],
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

DocumentModelSchema.index({ department: 1, program: 1, status: 1 });
DocumentModelSchema.index({ documentType: 1, academicYear: 1, status: 1 });
DocumentModelSchema.index({ isActive: 1, status: 1 });

export const AcademicDocument: Model<IDocument> =
  mongoose.models.AcademicDocument ||
  mongoose.model<IDocument>('AcademicDocument', DocumentModelSchema);
