import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

export function createApp({ authRouter, workspaceRouter, crmRouter, employeeRouter, estimateRouter, workOrderRouter, workOrderAssignmentRouter, workOrderActualsRouter, workOrderMediaRouter, employeeWorkOrderMediaRouter, additionalWorkRouter, workOrderSchedulingRouter, publicScheduleChangeRouter, assignedWorkOrderRouter, employeeOfflineSyncRouter, ownerOfflineProgressRouter, publicEstimateRouter, databaseReadinessRouter } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/health', healthRouter);
  if (databaseReadinessRouter) app.use('/health/ready', databaseReadinessRouter);

  if (authRouter) app.use('/api/auth', authRouter);
  if (workspaceRouter) app.use('/api/workspaces', workspaceRouter);
  if (crmRouter) app.use('/api/workspaces', crmRouter);
  if (employeeRouter) app.use('/api/workspaces', employeeRouter);
  if (estimateRouter) app.use('/api/workspaces', estimateRouter);
  if (workOrderRouter) app.use('/api/workspaces', workOrderRouter);
  if (workOrderAssignmentRouter) app.use('/api/workspaces', workOrderAssignmentRouter);
  if (workOrderActualsRouter) app.use('/api/workspaces', workOrderActualsRouter);
  if (workOrderMediaRouter) app.use('/api/workspaces', workOrderMediaRouter);
  if (additionalWorkRouter) app.use('/api/workspaces', additionalWorkRouter);
  if (workOrderSchedulingRouter) app.use('/api/workspaces', workOrderSchedulingRouter);
  if (ownerOfflineProgressRouter) app.use('/api/workspaces', ownerOfflineProgressRouter);
  if (assignedWorkOrderRouter) app.use('/api/assigned-work-order', assignedWorkOrderRouter);
  if (employeeOfflineSyncRouter) app.use('/api/assigned-work-order', employeeOfflineSyncRouter);
  if (employeeWorkOrderMediaRouter) app.use('/api/assigned-work-order', employeeWorkOrderMediaRouter);
  if (publicScheduleChangeRouter) app.use('/api/public/appointments', publicScheduleChangeRouter);
  if (publicEstimateRouter) app.use('/api/public/estimates', publicEstimateRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
