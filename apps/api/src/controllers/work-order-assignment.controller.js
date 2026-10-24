export function createWorkOrderAssignmentController({ assignmentService }) {
  return {
    list: async (request, response) => {
      const data = await assignmentService.listAssignments(request.workspace.id, request.params.workOrderId);
      response.status(200).json({ data });
    },
    assign: async (request, response) => {
      if (request.body?.owner === true) {
        const data = await assignmentService.assignOwner({
          workspaceId: request.workspace.id,
          workOrderId: request.params.workOrderId,
          actorUserId: request.auth.userId,
        });
        return response.status(201).json({ data });
      }
      const data = await assignmentService.assignEmployee({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        employeeId: request.body?.employeeId,
        language: request.auth.preferredLanguage,
      });
      return response.status(data.deliveryStatus === 'FAILED' ? 207 : 201).json({ data });
    },
    resendCode: async (request, response) => {
      const data = await assignmentService.resendAccessCode({
        workspaceId: request.workspace.id,
        assignmentId: request.params.assignmentId,
        actorUserId: request.auth.userId,
        language: request.auth.preferredLanguage,
      });
      response.status(data.deliveryStatus === 'FAILED' ? 207 : 200).json({ data });
    },
    revoke: async (request, response) => {
      const data = await assignmentService.revokeAssignment({
        workspaceId: request.workspace.id,
        assignmentId: request.params.assignmentId,
      });
      response.status(200).json({ data });
    },
    loadAssignedOrder: async (request, response) => {
      const data = await assignmentService.getAssignedWorkOrder(request.get('X-Work-Order-Access-Code'));
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).json({ data });
    },
    prepareAssignedOrderOffline: async (request, response) => {
      const data = await assignmentService.prepareOfflineWorkOrder(request.get('X-Work-Order-Access-Code'));
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).json({ data });
    },
    recordProgress: async (request, response) => {
      const data = await assignmentService.recordProgress({
        rawCode: request.get('X-Work-Order-Access-Code'),
        input: request.body ?? {},
      });
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(201).json({ data });
    },
    revealAccessCredential: async (request, response) => {
      const data = await assignmentService.revealAccessCredential({
        rawCode: request.get('X-Work-Order-Access-Code'),
        credentialId: request.params.credentialId,
      });
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ data });
    },
  };
}
