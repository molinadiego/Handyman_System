import { Router } from 'express';

export function createWorkOrderSchedulingRouter({ controller, ownerSessionMiddleware, ownedWorkspaceMiddleware, sameOriginMiddleware }) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const root = '/:workspaceId/work-orders/:workOrderId';

  router.get(`${root}/appointment-contact`, ...readScope, controller.getContact);
  router.put(`${root}/appointment-contact`, ...writeScope, controller.saveContact);
  router.post(`${root}/send-appointment-options`, ...writeScope, controller.sendAppointmentLink);
  router.get(`${root}/schedule-change-requests`, ...readScope, controller.listRequests);
  router.post(`${root}/schedule-change-requests/:requestId/decision`, ...writeScope, controller.decideRequest);
  return router;
}

export function createPublicScheduleChangeRouter({ controller, sameOriginMiddleware }) {
  const router = Router();
  router.post('/preview', sameOriginMiddleware, controller.previewPublicAppointment);
  router.post('/request', sameOriginMiddleware, controller.submitPublicAppointmentRequest);
  return router;
}
