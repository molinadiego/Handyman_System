export function createWorkOrderMediaController({ mediaService }) {
  const readUploadMetadata = (request) => {
    let filename = request.get('X-Original-File-Name') ?? 'upload';
    try { filename = decodeURIComponent(filename); } catch { /* Service normalizes the raw header. */ }
    return {
      body: request.body,
      contentType: request.get('Content-Type'),
      filename,
    };
  };

  const sendFile = (response, result) => {
    response.setHeader('Content-Type', result.attachment.contentType);
    response.setHeader('Content-Length', result.attachment.sizeBytes);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(result.attachment.originalName)}`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.status(200).send(result.body);
  };

  return {
    listOwner: async (request, response) => {
      const data = await mediaService.listForOwner(request.workspace.id, request.params.workOrderId);
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).json({ data });
    },
    uploadOwner: async (request, response) => {
      const data = await mediaService.uploadForOwner({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        actorUserId: request.auth.userId,
        ...readUploadMetadata(request),
      });
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(201).json({ data });
    },
    downloadOwner: async (request, response) => {
      const file = await mediaService.downloadForOwner({
        workspaceId: request.workspace.id,
        workOrderId: request.params.workOrderId,
        attachmentId: request.params.attachmentId,
      });
      sendFile(response, file);
    },
    listEmployee: async (request, response) => {
      const data = await mediaService.listForAssignedEmployee(request.get('X-Work-Order-Access-Code'));
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(200).json({ data });
    },
    uploadEmployee: async (request, response) => {
      const data = await mediaService.uploadForAssignedEmployee({
        rawCode: request.get('X-Work-Order-Access-Code'),
        ...readUploadMetadata(request),
      });
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(201).json({ data });
    },
    downloadEmployee: async (request, response) => {
      const file = await mediaService.downloadForAssignedEmployee({
        rawCode: request.get('X-Work-Order-Access-Code'),
        attachmentId: request.params.attachmentId,
      });
      sendFile(response, file);
    },
  };
}
