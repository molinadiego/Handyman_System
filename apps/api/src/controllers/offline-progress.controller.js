export function createOfflineProgressController({ offlineProgressService }) {
  return {
    sync: async (request, response) => {
      const data = await offlineProgressService.sync({
        rawCode: request.get('X-Work-Order-Access-Code'),
        rawEvents: request.body?.events,
        rawLockboxViews: request.body?.lockboxViews,
      });
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).json({ data });
    },
    listForOwner: async (request, response) => {
      const data = await offlineProgressService.listForOwner(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    resolveForOwner: async (request, response) => {
      const data = await offlineProgressService.resolveForOwner({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        eventId: request.params.eventId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
    resolveSensitiveAccessForOwner: async (request, response) => {
      const data = await offlineProgressService.resolveSensitiveAccessForOwner({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        eventId: request.params.eventId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
  };
}
