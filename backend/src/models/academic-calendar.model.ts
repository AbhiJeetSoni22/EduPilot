import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAcademicCalendar extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  academicYear: string;
  semester: 'Odd' | 'Even' | 'Annual' | 'All';
  eventType: 'Academic' | 'Examination' | 'Holiday' | 'Registration' | 'Event' | 'Deadline';
  startDate: Date;
  endDate: Date;
  description?: string;
  isHoliday: boolean;
  targetAudience: 'All' | 'Students' | 'Faculty' | 'Staff';
  department?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicCalendarSchema = new Schema<IAcademicCalendar>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g. 2025-26)'],
      default: '2025-26',
      trim: true,
    },
    semester: {
      type: String,
      enum: ['Odd', 'Even', 'Annual', 'All'],
      default: 'All',
    },
    eventType: {
      type: String,
      enum: ['Academic', 'Examination', 'Holiday', 'Registration', 'Event', 'Deadline'],
      required: [true, 'Event type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    isHoliday: {
      type: Boolean,
      default: false,
    },
    targetAudience: {
      type: String,
      enum: ['All', 'Students', 'Faculty', 'Staff'],
      default: 'All',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

AcademicCalendarSchema.index({ academicYear: 1, startDate: 1 });
AcademicCalendarSchema.index({ eventType: 1, semester: 1 });

export const AcademicCalendar: Model<IAcademicCalendar> =
  mongoose.models.AcademicCalendar ||
  mongoose.model<IAcademicCalendar>('AcademicCalendar', AcademicCalendarSchema);
