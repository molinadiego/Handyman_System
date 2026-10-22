export function createEstimateController({ estimateService }) {
  return {
    listRequests: async (request, response) => {
      const data = await estimateService.listServiceRequests(request.workspace.id);
      response.status(200).json({ data });
    },
    createRequest: async (request, response) => {
      const data = await estimateService.createServiceRequest({
        workspaceId: request.workspace.id,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    updateRequestStatus: async (request, response) => {
      const data = await estimateService.updateServiceRequestStatus({
        workspaceId: request.workspace.id,
        requestId: request.params.requestId,
        actorUserId: request.auth.userId,
        status: request.body?.status,
      });
      response.status(200).json({ data });
    },
    listEstimates: async (request, response) => {
      const data = await estimateService.listEstimates(request.workspace.id);
      response.status(200).json({ data });
    },
    createEstimate: async (request, response) => {
      const data = await estimateService.createEstimateDraft({
        workspaceId: request.workspace.id,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(201).json({ data });
    },
    getEstimate: async (request, response) => {
      const data = await estimateService.getEstimate(request.workspace.id, request.params.estimateId);
      if (!data) return response.status(404).json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.' } });
      response.status(200).json({ data });
    },
    saveEstimateVersion: async (request, response) => {
      const data = await estimateService.saveEstimateVersion({
        workspaceId: request.workspace.id,
        estimateId: request.params.estimateId,
        actorUserId: request.auth.userId,
        input: request.body ?? {},
      });
      response.status(200).json({ data });
    },
    sendEstimate: async (request, response) => {
      const data = await estimateService.sendEstimate({
        workspaceId: request.workspace.id,
        estimateId: request.params.estimateId,
        actorUserId: request.auth.userId,
        recipients: request.body?.recipients,
        language: request.auth.preferredLanguage,
      });
      response.status(data.failedCount ? 207 : 200).json({ data });
    },
    downloadEstimatePdf: async (request, response) => {
      const pdf = await estimateService.downloadEstimatePdf({
        workspaceId: request.workspace.id,
        estimateId: request.params.estimateId,
        language: request.auth.preferredLanguage,
      });
      response.setHeader('Content-Type', 'application/pdf');
      response.setHeader('Content-Disposition', `attachment; filename="${pdf.filename}"`);
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).send(pdf.buffer);
    },
    rejectEstimate: async (request, response) => {
      const data = await estimateService.rejectEstimate({
        workspaceId: request.workspace.id,
        estimateId: request.params.estimateId,
        actorUserId: request.auth.userId,
        reason: request.body?.reason,
      });
      response.status(200).json({ data });
    },
    acceptPublicEstimate: async (request, response) => {
      const data = await estimateService.acceptEstimate(request.body?.token);
      response.status(200).json({ data });
    },
  };
}
