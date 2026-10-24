export function createWorkOrderController({ workOrderService }) {
  return {
    list: async (request, response) => {
      const data = await workOrderService.listWorkOrders(request.workspace.id);
      response.status(200).json({ data });
    },
    createDirect: async (request, response) => {
      const data = await workOrderService.createDirectWorkOrder({
        workspaceId: request.workspace.id,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    createFromEstimate: async (request, response) => {
      const data = await workOrderService.createFromAcceptedEstimate({
        workspaceId: request.workspace.id,
        estimateId: request.params.estimateId,
        actorUserId: request.auth.userId,
      });
      response.status(201).json({ data });
    },
    updateStatus: async (request, response) => {
      const data = await workOrderService.updateStatus({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        status: request.body?.status,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    updateSchedule: async (request, response) => {
      const data = await workOrderService.updateSchedule({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
    updatePriority: async (request, response) => {
      const data = await workOrderService.updatePriority({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        priority: request.body?.priority,
      });
      response.status(200).json({ data });
    },
  };
}
