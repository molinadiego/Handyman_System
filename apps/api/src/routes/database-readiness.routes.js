import { Router } from 'express';

export function createDatabaseReadinessRouter(prisma) {
  const router = Router();

  router.get('/', async (_request, response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return response.status(200).json({ status: 'ok', database: 'ok' });
    } catch {
      return response.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  return router;
}
