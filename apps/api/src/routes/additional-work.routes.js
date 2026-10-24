import { Router } from 'express';

export function createAdditionalWorkRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const root = '/:workspaceId/work-orders/:workOrderId/additional-work';

  router.get(root, ...readScope, controller.list);
  router.post(root, ...writeScope, controller.create);
  router.post(`${root}/:additionalWorkId/approve`, ...writeScope, controller.approve);
  router.post(`${root}/:additionalWorkId/reject`, ...writeScope, controller.reject);
  router.post(`${root}/:additionalWorkId/cancel`, ...writeScope, controller.cancel);
  return router;
}
