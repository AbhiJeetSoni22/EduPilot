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
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  queryAnalyzerModel: process.env.QUERY_ANALYZER_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  ragGenerationModel: process.env.RAG_GENERATION_MODEL || 'gemini-3.7-flash',
  geminiQueryTimeoutMs: parseInt(process.env.GEMINI_QUERY_TIMEOUT_MS || '15000', 10),
  geminiGenerationTimeoutMs: parseInt(process.env.GEMINI_GENERATION_TIMEOUT_MS || '20000', 10),
  geminiMaxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '1', 10),
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  geminiEmbeddingDimensions: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS || '768', 10),
  jwtSecret: process.env.JWT_SECRET || 'default_dev_secret_change_in_production',
  isProduction: process.env.NODE_ENV === 'production',
};
