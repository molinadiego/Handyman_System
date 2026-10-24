export function createWorkOrderSchedulingController({ schedulingService }) {
  return {
    getContact: async (request, response) => {
      const data = await schedulingService.getContact(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    saveContact: async (request, response) => {
      const data = await schedulingService.saveContact({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
    sendAppointmentLink: async (request, response) => {
      const data = await schedulingService.sendAppointmentLink({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        language: request.auth.preferredLanguage,
      });
      response.status(data.deliveryStatus === 'FAILED' ? 207 : 200).json({ data });
    },
    listRequests: async (request, response) => {
      const data = await schedulingService.listRequests(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    decideRequest: async (request, response) => {
      const data = await schedulingService.decideRequest({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        requestId: request.params.requestId,
        actorUserId: request.auth.userId,
        decision: request.body?.decision,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    previewPublicAppointment: async (request, response) => {
      const data = await schedulingService.previewAppointmentLink(request.body?.token);
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ data });
    },
    submitPublicAppointmentRequest: async (request, response) => {
      const data = await schedulingService.submitAppointmentRequest({
        token: request.body?.token,
        input: request.body ?? {},
      });
      response.setHeader('Cache-Control', 'no-store');
      response.status(201).json({ data });
    },
  };
}
