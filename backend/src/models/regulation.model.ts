import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegulation extends Document {
  _id: mongoose.Types.ObjectId;
  regulationCode: string;
  title: string;
  category: 'attendance' | 'grading' | 'promotion' | 'examination' | 'disciplinary' | 'general';
  academicYear: string;
  summary: string;
  content: string;
  keyRules: string[];
  status: 'active' | 'superseded' | 'draft';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegulationSchema = new Schema<IRegulation>(
  {
    regulationCode: {
      type: String,
      required: [true, 'Regulation code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, 'Regulation title is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['attendance', 'grading', 'promotion', 'examination', 'disciplinary', 'general'],
      required: [true, 'Regulation category is required'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      default: '2025-26',
      trim: true,
    },
    summary: {
      type: String,
      required: [true, 'Brief summary is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Full regulation content is required'],
      trim: true,
    },
    keyRules: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'superseded', 'draft'],
      default: 'active',
    },
    version: {
      type: String,
      default: '1.0',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

RegulationSchema.index({ category: 1, academicYear: 1, status: 1 });
RegulationSchema.index({ title: 'text', summary: 'text', content: 'text' });

export const Regulation: Model<IRegulation> =
  mongoose.models.Regulation || mongoose.model<IRegulation>('Regulation', RegulationSchema);
