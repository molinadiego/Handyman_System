export function createPrismaWorkspaceRepository(prisma) {
  return {
    findOwnedWorkspace({ workspaceId, ownerUserId }) {
      return prisma.workspace.findFirst({
        where: { id: workspaceId, ownerUserId },
        select: { id: true, ownerUserId: true, name: true, timeZone: true },
      });
    },

    createOwnedWorkspace({ ownerUserId, name, timeZone }) {
      return prisma.workspace.create({
        data: { ownerUserId, name, timeZone },
        select: { id: true, ownerUserId: true, name: true, timeZone: true },
      });
    },

    listOwnedWorkspaces(ownerUserId) {
      return prisma.workspace.findMany({
        where: { ownerUserId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, timeZone: true, createdAt: true },
      });
    },
  };
}
