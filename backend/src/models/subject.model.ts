import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISyllabusUnit {
  unitNumber: number;
  title: string;
  topics: string[];
  hours?: number;
}

export interface IEvaluationScheme {
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  passingMarks: number;
}

export interface ISubject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  department: mongoose.Types.ObjectId;
  program: mongoose.Types.ObjectId;
  semester: number;
  credits: number;
  type: 'Theory' | 'Practical' | 'Theory + Practical' | 'Elective';
  academicYear: string;
  description?: string;
  syllabusUnits: ISyllabusUnit[];
  evaluationScheme: IEvaluationScheme;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const SyllabusUnitSchema = new Schema<ISyllabusUnit>(
  {
    unitNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    topics: [{ type: String, trim: true }],
    hours: { type: Number, default: 8 },
  },
  { _id: false }
);

const EvaluationSchemeSchema = new Schema<IEvaluationScheme>(
  {
    internalMarks: { type: Number, default: 40 },
    externalMarks: { type: Number, default: 60 },
    totalMarks: { type: Number, default: 100 },
    passingMarks: { type: Number, default: 40 },
  },
  { _id: false }
);

const SubjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
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
    credits: {
      type: Number,
      required: [true, 'Credits are required'],
      min: 1,
      max: 10,
    },
    type: {
      type: String,
      enum: ['Theory', 'Practical', 'Theory + Practical', 'Elective'],
      default: 'Theory',
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      default: '2025-26',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    syllabusUnits: {
      type: [SyllabusUnitSchema],
      default: [],
    },
    evaluationScheme: {
      type: EvaluationSchemeSchema,
      default: () => ({
        internalMarks: 40,
        externalMarks: 60,
        totalMarks: 100,
        passingMarks: 40,
      }),
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

SubjectSchema.index({ code: 1, academicYear: 1, program: 1 });
SubjectSchema.index({ department: 1, semester: 1 });

export const Subject: Model<ISubject> =
  mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);
