import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExam extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subject: mongoose.Types.ObjectId;
  subjectCode: string;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  semester: number;
  academicYear: string;
  examType: 'Mid-Semester' | 'End-Semester' | 'Quiz' | 'Practical' | 'Supplementary';
  examDate: Date;
  startTime: string;
  endTime: string;
  venue: string;
  maxMarks: number;
  instructions: string[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
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
    examType: {
      type: String,
      enum: ['Mid-Semester', 'End-Semester', 'Quiz', 'Practical', 'Supplementary'],
      required: [true, 'Exam type is required'],
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g. 10:00 AM)'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g. 01:00 PM)'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue / Exam Hall is required'],
      trim: true,
    },
    maxMarks: {
      type: Number,
      default: 100,
    },
    instructions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

ExamSchema.index({ department: 1, program: 1, semester: 1, examDate: 1 });
ExamSchema.index({ subject: 1, examType: 1 });

export const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);
