export function createWorkspaceController({ workspaceService }) {
  return {
    list: async (request, response) => {
      const workspaces = await workspaceService.listForOwner(request.auth.userId);
      response.status(200).json({ data: workspaces });
    },

    create: async (request, response) => {
      const workspace = await workspaceService.createForOwner({
        ownerUserId: request.auth.userId,
        name: request.body?.name,
        timeZone: request.body?.timeZone,
      });
      response.status(201).json({ data: workspace });
    },

  };
}
