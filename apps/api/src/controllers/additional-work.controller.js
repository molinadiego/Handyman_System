export function createAdditionalWorkController({ additionalWorkService }) {
  return {
    list: async (request, response) => {
      const data = await additionalWorkService.list(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    create: async (request, response) => {
      const data = await additionalWorkService.create({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    approve: async (request, response) => {
      const data = await additionalWorkService.approve({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        additionalWorkId: request.params.additionalWorkId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
    reject: async (request, response) => {
      const data = await additionalWorkService.reject({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        additionalWorkId: request.params.additionalWorkId,
        actorUserId: request.auth.userId,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    cancel: async (request, response) => {
      const data = await additionalWorkService.cancel({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        additionalWorkId: request.params.additionalWorkId,
        actorUserId: request.auth.userId,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
  };
}
