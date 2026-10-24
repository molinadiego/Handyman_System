export function createPrismaWorkOrderActualsRepository(prisma) {
  return {
    async listActuals(workspaceId, workOrderId) {
      const [workLogs, materials, adjustments] = await Promise.all([
        prisma.workLog.findMany({
          where: { workspaceId, workOrderId },
          orderBy: { startedAt: 'asc' },
        }),
        prisma.materialLine.findMany({
          where: { workspaceId, workOrderId },
          orderBy: { createdAt: 'asc' },
          include: { payerEmployee: { select: { id: true, name: true } } },
        }),
        prisma.workOrderAdjustment.findMany({
          where: { workspaceId, workOrderId },
          orderBy: { createdAt: 'asc' },
        }),
      ]);
      return { workLogs, materials, adjustments };
    },

    createWorkLog({ workspaceId, workOrderId, createdByUserId, startedAt, endedAt, durationMinutes, note }) {
      return prisma.workLog.create({
        data: { workspaceId, workOrderId, createdByUserId, startedAt, endedAt, durationMinutes, note },
      });
    },

    async voidWorkLog({ workspaceId, workOrderId, workLogId, actorUserId, reason, occurredAt }) {
      const updated = await prisma.workLog.updateMany({
        where: { workspaceId, workOrderId, id: workLogId, voidedAt: null },
        data: { voidedAt: occurredAt, voidedByUserId: actorUserId, voidReason: reason },
      });
      if (!updated.count) return null;
      return prisma.workLog.findFirst({ where: { workspaceId, workOrderId, id: workLogId } });
    },

    createMaterialLine({ workspaceId, workOrderId, recordedByUserId, data }) {
      return prisma.materialLine.create({
        data: { workspaceId, workOrderId, recordedByUserId, ...data },
        include: { payerEmployee: { select: { id: true, name: true } } },
      });
    },

    async voidMaterialLine({ workspaceId, workOrderId, materialLineId, actorUserId, reason, occurredAt }) {
      const updated = await prisma.materialLine.updateMany({
        where: { workspaceId, workOrderId, id: materialLineId, voidedAt: null },
        data: { voidedAt: occurredAt, voidedByUserId: actorUserId, voidReason: reason },
      });
      if (!updated.count) return null;
      return prisma.materialLine.findFirst({
        where: { workspaceId, workOrderId, id: materialLineId },
        include: { payerEmployee: { select: { id: true, name: true } } },
      });
    },

    async createAdjustment({ workspaceId, workOrderId, createdByUserId, data, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const order = await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId },
          data: { updatedAt: occurredAt },
        });
        if (!order.count) return null;
        return transaction.workOrderAdjustment.create({ data: { workspaceId, workOrderId, createdByUserId, ...data } });
      });
    },
  };
}
