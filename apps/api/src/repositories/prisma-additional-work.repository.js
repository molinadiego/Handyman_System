const additionalWorkInclude = {
  events: {
    orderBy: { occurredAt: 'asc' },
    include: { actor: { select: { id: true, email: true } } },
  },
};

export function createPrismaAdditionalWorkRepository(prisma) {
  return {
    list(workspaceId, workOrderId) {
      return prisma.additionalWork.findMany({
        where: { workspaceId, workOrderId },
        orderBy: { createdAt: 'asc' },
        include: additionalWorkInclude,
      });
    },

    async create({ workspaceId, workOrderId, actorUserId, data, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true, status: true, updatedAt: true },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        if (['COMPLETED', 'CANCELED'].includes(workOrder.status)) return { error: 'WORK_ORDER_LOCKED' };
        const locked = await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId, status: workOrder.status },
          data: { updatedAt: workOrder.updatedAt },
        });
        if (!locked.count) return { error: 'CONFLICT' };
        const additionalWork = await transaction.additionalWork.create({
          data: { workspaceId, workOrderId, createdByUserId: actorUserId, ...data },
        });
        await transaction.additionalWorkEvent.create({
          data: {
            workspaceId,
            additionalWorkId: additionalWork.id,
            fromStatus: null,
            toStatus: 'PENDING_AUTHORIZATION',
            type: 'CREATED',
            actorUserId,
            occurredAt,
          },
        });
        return {
          data: await transaction.additionalWork.findFirst({
            where: { workspaceId, id: additionalWork.id },
            include: additionalWorkInclude,
          }),
        };
      });
    },

    async approve({ workspaceId, workOrderId, additionalWorkId, actorUserId, data, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true, status: true, updatedAt: true },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        if (['COMPLETED', 'CANCELED'].includes(workOrder.status)) return { error: 'WORK_ORDER_LOCKED' };
        const locked = await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId, status: workOrder.status },
          data: { updatedAt: workOrder.updatedAt },
        });
        if (!locked.count) return { error: 'CONFLICT' };
        const existing = await transaction.additionalWork.findFirst({
          where: { workspaceId, workOrderId, id: additionalWorkId },
          select: { id: true, status: true },
        });
        if (!existing) return { error: 'NOT_FOUND' };
        if (existing.status !== 'PENDING_AUTHORIZATION') return { error: 'NOT_PENDING' };
        const updated = await transaction.additionalWork.updateMany({
          where: { workspaceId, workOrderId, id: additionalWorkId, status: 'PENDING_AUTHORIZATION' },
          data: {
            status: 'APPROVED',
            approvedAmount: data.approvedAmount,
            authorizationMethod: data.authorizationMethod,
            authorizedByName: data.authorizedByName,
            authorizationDetails: data.authorizationDetails,
            authorizedAt: occurredAt,
            decidedByUserId: actorUserId,
            decidedAt: occurredAt,
          },
        });
        if (!updated.count) return { error: 'CONFLICT' };
        await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId, status: { notIn: ['COMPLETED', 'CANCELED'] } },
          data: { updatedAt: occurredAt },
        });
        await transaction.additionalWorkEvent.create({
          data: {
            workspaceId,
            additionalWorkId,
            fromStatus: existing.status,
            toStatus: 'APPROVED',
            type: 'APPROVED',
            actorUserId,
            authorizationMethod: data.authorizationMethod,
            authorizedByName: data.authorizedByName,
            approvedAmount: data.approvedAmount,
            occurredAt,
          },
        });
        return {
          data: await transaction.additionalWork.findFirst({
            where: { workspaceId, id: additionalWorkId },
            include: additionalWorkInclude,
          }),
        };
      });
    },

    async decide({ workspaceId, workOrderId, additionalWorkId, actorUserId, status, reason, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const existing = await transaction.additionalWork.findFirst({
          where: { workspaceId, workOrderId, id: additionalWorkId },
          select: { id: true, status: true },
        });
        if (!existing) return { error: 'NOT_FOUND' };
        if (existing.status !== 'PENDING_AUTHORIZATION') return { error: 'NOT_PENDING' };
        const eventType = status === 'REJECTED' ? 'REJECTED' : 'CANCELED';
        const updated = await transaction.additionalWork.updateMany({
          where: { workspaceId, workOrderId, id: additionalWorkId, status: 'PENDING_AUTHORIZATION' },
          data: { status, decidedByUserId: actorUserId, decidedAt: occurredAt },
        });
        if (!updated.count) return { error: 'CONFLICT' };
        await transaction.additionalWorkEvent.create({
          data: {
            workspaceId,
            additionalWorkId,
            fromStatus: existing.status,
            toStatus: status,
            type: eventType,
            actorUserId,
            reason,
            occurredAt,
          },
        });
        return {
          data: await transaction.additionalWork.findFirst({
            where: { workspaceId, id: additionalWorkId },
            include: additionalWorkInclude,
          }),
        };
      });
    },
  };
}
