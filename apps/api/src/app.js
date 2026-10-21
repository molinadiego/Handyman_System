import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);
