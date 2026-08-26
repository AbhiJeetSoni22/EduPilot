import mongoose, { Schema, Document, Model } from 'mongoose';
import { QueryContext } from '../types/query-context';
import { QueryAnalysis } from '../types/query-analysis.types';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  queryAnalysis?: QueryAnalysis;
  timestamp: Date;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: string;
  messages: IMessage[];
  queryContext: QueryContext;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    queryAnalysis: {
      type: Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const QueryContextSchema = new Schema<QueryContext>(
  {
    rollNumber: { type: String, default: null },
    department: { type: String, default: null },
    program: { type: String, default: null },
    semester: { type: Number, default: null },
    academicYear: { type: String, default: null },
    subject: { type: String, default: null },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    queryContext: {
      type: QueryContextSchema,
      default: () => ({}),
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);
