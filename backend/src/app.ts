import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { rateLimit } from './middleware/rate-limit.middleware';

export function createApp(): Application {
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use('/api', rateLimit({ windowMs: 60_000, max: 120 }), routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
