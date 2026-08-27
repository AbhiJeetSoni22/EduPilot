import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3004',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_academic_assistant',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  geminiEmbeddingDimensions: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS || '768', 10),
  jwtSecret: process.env.JWT_SECRET || 'default_dev_secret_change_in_production',
  isProduction: process.env.NODE_ENV === 'production',
};
