import { Router } from 'express';

export function createOwnerOfflineProgressRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  router.get('/:workspaceId/work-orders/:workOrderId/offline-progress', ownerSessionMiddleware, ownedWorkspaceMiddleware, controller.listForOwner);
  router.post('/:workspaceId/work-orders/:workOrderId/offline-progress/:eventId/resolve', sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware, controller.resolveForOwner);
  router.post('/:workspaceId/work-orders/:workOrderId/offline-access-events/:eventId/resolve', sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware, controller.resolveSensitiveAccessForOwner);
  return router;
}

export function createEmployeeOfflineSyncRouter({ controller, sameOriginMiddleware }) {
  const router = Router();
  router.post('/offline-sync', sameOriginMiddleware, controller.sync);
  return router;
}
