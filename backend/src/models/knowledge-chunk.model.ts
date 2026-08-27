import mongoose, { Schema, Document as MongooseDocument, Model } from 'mongoose';

export interface IChunkMetadata {
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  semester?: number;
  subjectCode?: string;
  subjectName?: string;
  academicYear?: string;
  documentType?: string;
  sectionTitle?: string;
  unitNumber?: number;
}

export interface IKnowledgeChunk extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  text: string;
  embedding: number[];
  chunkIndex: number;
  pageNumber?: number;
  metadata: IChunkMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const ChunkMetadataSchema = new Schema<IChunkMetadata>(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department metadata is required'],
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: [true, 'Program metadata is required'],
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    subjectCode: {
      type: String,
      trim: true,
      default: null,
    },
    subjectName: {
      type: String,
      trim: true,
      default: null,
    },
    academicYear: {
      type: String,
      trim: true,
      default: null,
    },
    documentType: {
      type: String,
      trim: true,
      default: null,
    },
    sectionTitle: {
      type: String,
      trim: true,
      default: null,
    },
    unitNumber: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicDocument',
      required: [true, 'Document reference is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Chunk text content is required'],
      trim: true,
    },
    embedding: {
      type: [Number],
      required: [true, 'Embedding vector is required'],
      validate: {
        validator: function (val: number[]) {
          return Array.isArray(val) && val.length === 768;
        },
        message: 'Embedding vector must have exactly 768 dimensions',
      },
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index is required'],
    },
    pageNumber: {
      type: Number,
      default: null,
    },
    metadata: {
      type: ChunkMetadataSchema,
      required: [true, 'Chunk metadata is required'],
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_chunks',
  }
);

// Metadata query indexes for pre-filtering
KnowledgeChunkSchema.index({ 'metadata.department': 1, 'metadata.program': 1, 'metadata.semester': 1 });
KnowledgeChunkSchema.index({ 'metadata.subjectCode': 1 });
KnowledgeChunkSchema.index({ 'metadata.documentType': 1 });
KnowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const KnowledgeChunk: Model<IKnowledgeChunk> =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);
