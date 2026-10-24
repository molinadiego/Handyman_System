import { Router } from 'express';

export function createEmployeeRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];

  router.get('/:workspaceId/employees', ...readScope, controller.list);
  router.post('/:workspaceId/employees', ...writeScope, controller.create);
  router.patch('/:workspaceId/employees/:employeeId', ...writeScope, controller.update);
  return router;
}

export function createWorkOrderAssignmentRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];

  router.get('/:workspaceId/work-orders/:workOrderId/assignments', ...readScope, controller.list);
  router.post('/:workspaceId/work-orders/:workOrderId/assignments', ...writeScope, controller.assign);
  router.post('/:workspaceId/work-order-assignments/:assignmentId/resend-code', ...writeScope, controller.resendCode);
  router.post('/:workspaceId/work-order-assignments/:assignmentId/revoke', ...writeScope, controller.revoke);
  return router;
}

export function createAssignedWorkOrderRouter({ controller, sameOriginMiddleware }) {
  const router = Router();
  router.get('/', controller.loadAssignedOrder);
  router.post('/prepare-offline', sameOriginMiddleware, controller.prepareAssignedOrderOffline);
  router.post('/progress', sameOriginMiddleware, controller.recordProgress);
  router.post('/access-credentials/:credentialId/reveal', sameOriginMiddleware, controller.revealAccessCredential);
  return router;
}
