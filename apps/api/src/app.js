import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

export function createApp({ authRouter, workspaceRouter, databaseReadinessRouter } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  if (databaseReadinessRouter) app.use('/health/ready', databaseReadinessRouter);

  if (authRouter) app.use('/api/auth', authRouter);
  if (workspaceRouter) app.use('/api/workspaces', workspaceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
