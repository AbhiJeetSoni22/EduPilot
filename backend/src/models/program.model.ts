import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProgram extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  department: mongoose.Types.ObjectId;
  degreeType: 'Undergraduate' | 'Postgraduate' | 'Diploma' | 'Doctorate';
  durationYears: number;
  totalSemesters: number;
  academicYear: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProgramSchema = new Schema<IProgram>(
  {
    name: {
      type: String,
      required: [true, 'Program name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Program code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    degreeType: {
      type: String,
      enum: ['Undergraduate', 'Postgraduate', 'Diploma', 'Doctorate'],
      default: 'Undergraduate',
    },
    durationYears: {
      type: Number,
      default: 4,
      min: 1,
      max: 6,
    },
    totalSemesters: {
      type: Number,
      default: 8,
      min: 1,
      max: 12,
    },
    academicYear: {
      type: String,
      default: '2025-26',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

ProgramSchema.index({ department: 1, code: 1 });

export const Program: Model<IProgram> =
  mongoose.models.Program || mongoose.model<IProgram>('Program', ProgramSchema);
