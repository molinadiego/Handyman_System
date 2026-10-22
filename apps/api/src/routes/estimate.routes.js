import { Router } from 'express';

export function createEstimateRouter({
  controller,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
}) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];

  router.get('/:workspaceId/requests', ...readScope, controller.listRequests);
  router.post('/:workspaceId/requests', ...writeScope, controller.createRequest);
  router.patch('/:workspaceId/requests/:requestId/status', ...writeScope, controller.updateRequestStatus);

  router.get('/:workspaceId/estimates', ...readScope, controller.listEstimates);
  router.post('/:workspaceId/estimates', ...writeScope, controller.createEstimate);
  router.get('/:workspaceId/estimates/:estimateId', ...readScope, controller.getEstimate);
  router.patch('/:workspaceId/estimates/:estimateId', ...writeScope, controller.saveEstimateVersion);
  router.post('/:workspaceId/estimates/:estimateId/send', ...writeScope, controller.sendEstimate);
  router.get('/:workspaceId/estimates/:estimateId/pdf', ...readScope, controller.downloadEstimatePdf);
  router.post('/:workspaceId/estimates/:estimateId/reject', ...writeScope, controller.rejectEstimate);

  return router;
}

export function createPublicEstimateRouter({ controller, sameOriginMiddleware }) {
  const router = Router();
  router.post('/accept', sameOriginMiddleware, controller.acceptPublicEstimate);
  return router;
}
