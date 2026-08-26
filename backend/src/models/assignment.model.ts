import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subject: mongoose.Types.ObjectId;
  subjectCode: string;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  semester: number;
  academicYear: string;
  description: string;
  dueDate: Date;
  totalMarks: number;
  weightage?: number;
  submissionFormat: 'PDF' | 'ZIP' | 'Code Repository' | 'Hard Copy' | 'Online Form';
  instructions: string[];
  status: 'active' | 'closed' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required'],
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
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
      required: [true, 'Semester is required'],
      min: 1,
      max: 12,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      default: '2025-26',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      default: 20,
    },
    weightage: {
      type: Number,
      default: 10,
    },
    submissionFormat: {
      type: String,
      enum: ['PDF', 'ZIP', 'Code Repository', 'Hard Copy', 'Online Form'],
      default: 'PDF',
    },
    instructions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

AssignmentSchema.index({ department: 1, program: 1, semester: 1, dueDate: 1 });
AssignmentSchema.index({ subject: 1, status: 1 });

export const Assignment: Model<IAssignment> =
  mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
