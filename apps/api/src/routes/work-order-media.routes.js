import { Router } from 'express';
import express from 'express';

const uploadBody = express.raw({ type: '*/*', limit: '50mb' });

export function createOwnerWorkOrderMediaRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const root = '/:workspaceId/work-orders/:workOrderId/media';

  router.get(root, ...readScope, controller.listOwner);
  router.post(root, ...writeScope, uploadBody, controller.uploadOwner);
  router.get(`${root}/:attachmentId`, ...readScope, controller.downloadOwner);
  return router;
}

export function createEmployeeWorkOrderMediaRouter({ controller, sameOriginMiddleware }) {
  const router = Router();
  router.get('/media', controller.listEmployee);
  router.post('/media', sameOriginMiddleware, uploadBody, controller.uploadEmployee);
  router.get('/media/:attachmentId', controller.downloadEmployee);
  return router;
}
