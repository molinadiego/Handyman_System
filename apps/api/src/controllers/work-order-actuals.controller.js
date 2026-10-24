export function createWorkOrderActualsController({ actualsService }) {
  return {
    list: async (request, response) => {
      const data = await actualsService.listActuals(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    createWorkLog: async (request, response) => {
      const data = await actualsService.createWorkLog({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    voidWorkLog: async (request, response) => {
      const data = await actualsService.voidWorkLog({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        workLogId: request.params.workLogId,
        actorUserId: request.auth.userId,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    createMaterial: async (request, response) => {
      const data = await actualsService.createMaterialLine({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    voidMaterial: async (request, response) => {
      const data = await actualsService.voidMaterialLine({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        materialLineId: request.params.materialLineId,
        actorUserId: request.auth.userId,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    createAdjustment: async (request, response) => {
      const data = await actualsService.createAdjustment({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
  };
}
