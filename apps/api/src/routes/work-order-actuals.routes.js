import { Router } from 'express';

export function createWorkOrderActualsRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const root = '/:workspaceId/work-orders/:workOrderId/actuals';

  router.get(root, ...readScope, controller.list);
  router.post(`${root}/work-logs`, ...writeScope, controller.createWorkLog);
  router.post(`${root}/work-logs/:workLogId/void`, ...writeScope, controller.voidWorkLog);
  router.post(`${root}/materials`, ...writeScope, controller.createMaterial);
  router.post(`${root}/materials/:materialLineId/void`, ...writeScope, controller.voidMaterial);
  router.post(`${root}/adjustments`, ...writeScope, controller.createAdjustment);
  return router;
}
