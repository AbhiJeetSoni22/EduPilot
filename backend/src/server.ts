import { createApp } from './app';
import { config } from './config/env';
import { connectDatabase } from './config/db';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  const app = createApp();

  // Attempt database connection
  await connectDatabase();

  // Start Express listener
  const server = app.listen(config.port, () => {
    logger.info(`Server is running at http://localhost:${config.port}`);
    logger.info(`Health check available at http://localhost:${config.port}/api/health`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    logger.info('Received shutdown signal, closing server gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
