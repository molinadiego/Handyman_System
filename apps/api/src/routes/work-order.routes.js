import { Router } from 'express';

export function createWorkOrderRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];

  router.get('/:workspaceId/work-orders', ...readScope, controller.list);
  router.post('/:workspaceId/work-orders', ...writeScope, controller.createDirect);
  router.post('/:workspaceId/work-orders/from-estimate/:estimateId', ...writeScope, controller.createFromEstimate);
  router.patch('/:workspaceId/work-orders/:workOrderId/status', ...writeScope, controller.updateStatus);
  router.put('/:workspaceId/work-orders/:workOrderId/schedule', ...writeScope, controller.updateSchedule);
  router.patch('/:workspaceId/work-orders/:workOrderId/priority', ...writeScope, controller.updatePriority);
  return router;
}
