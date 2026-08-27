import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './env';
import { logger } from '../utils/logger';

// Configure DNS fallback for Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore in restricted environments
}

export async function connectDatabase(): Promise<typeof mongoose | null> {
  try {
    logger.info(`Attempting MongoDB connection to ${config.mongodbUri}...`);
    
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s if MongoDB is unreachable
    });

    logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    logger.warn(`MongoDB connection warning: ${errMessage}. Server running with degraded DB status.`);
    return null;
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost / disconnected.');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected.');
});

export function getDatabaseStatus(): {
  status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'uninitialized';
  host?: string;
  name?: string;
} {
  const readyState = mongoose.connection.readyState;
  
  switch (readyState) {
    case 1:
      return {
        status: 'connected',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      };
    case 2:
      return { status: 'connecting' };
    case 3:
      return { status: 'disconnecting' };
    case 0:
    default:
      return { status: 'disconnected' };
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly.');
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown database error';
    logger.warn(`Error during MongoDB disconnection: ${errMessage}`);
  }
}

