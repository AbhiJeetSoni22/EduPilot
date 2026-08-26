import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export type DocumentType =
  | 'academic_regulations'
  | 'examination_rules'
  | 'attendance_policy'
  | 'grading_policy'
  | 'syllabus'
  | 'student_handbook'
  | 'academic_circular';

export type DocumentStatus = 'uploaded' | 'processing' | 'processed' | 'failed' | 'archived';

export interface IDocument extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  title: string;
  documentType: DocumentType;
  department?: mongoose.Types.ObjectId;
  program?: mongoose.Types.ObjectId;
  semester?: number;
  academicYear: string;
  version: string;
  status: DocumentStatus;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storageReference: string;
  uploadedBy: mongoose.Types.ObjectId;
  tags: string[];
  description?: string;
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
      ],
      required: [true, 'Document type is required'],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      default: null,
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      default: '2025-26',
      trim: true,
    },
    version: {
      type: String,
      default: '1.0',
      trim: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'processed', 'failed', 'archived'],
      default: 'uploaded',
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    storageReference: {
      type: String,
      required: [true, 'Storage reference is required'],
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required'],
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
  },
  {
    timestamps: true,
  }
);

DocumentModelSchema.index({ documentType: 1, academicYear: 1, status: 1 });
DocumentModelSchema.index({ department: 1, program: 1 });

export const AcademicDocument: Model<IDocument> =
  mongoose.models.AcademicDocument ||
  mongoose.model<IDocument>('AcademicDocument', DocumentModelSchema);
