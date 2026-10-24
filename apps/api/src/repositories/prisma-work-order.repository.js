import { filterSharedResourceConflicts } from '../models/work-order-schedule.model.js';

const workOrderInclude = {
  customer: { select: { id: true, name: true, companyName: true } },
  propertyManager: { select: { id: true, name: true, companyName: true } },
  property: { select: { id: true, addressLine1: true, city: true, state: true, postalCode: true } },
  contact: { select: { id: true, type: true, name: true, email: true, phone: true } },
  serviceRequest: { select: { id: true, requesterName: true, description: true } },
  estimate: { select: { id: true, number: true } },
  estimateVersion: { select: { id: true, versionNumber: true } },
  lines: { orderBy: { position: 'asc' } },
  events: { orderBy: { occurredAt: 'desc' } },
  scheduleEvents: { orderBy: { occurredAt: 'desc' } },
  priorityEvents: { orderBy: { occurredAt: 'desc' } },
  progressEvents: {
    orderBy: { occurredAt: 'asc' },
    include: { assignment: { include: { employee: { select: { name: true } } } } },
  },
};

async function allocateWorkOrderNumber(transaction, workspaceId) {
  const workspace = await transaction.workspace.update({
    where: { id: workspaceId },
    data: { nextWorkOrderNumber: { increment: 1 } },
    select: { nextWorkOrderNumber: true },
  });
  return workspace.nextWorkOrderNumber - 1;
}

export function createPrismaWorkOrderRepository(prisma) {
  return {
    listWorkOrders(workspaceId) {
      return prisma.workOrder.findMany({
        where: { workspaceId },
        orderBy: [{ scheduledStartAt: 'asc' }, { createdAt: 'desc' }],
        include: workOrderInclude,
      });
    },

    getWorkspaceTimeZone(workspaceId) {
      return prisma.workspace.findUnique({ where: { id: workspaceId }, select: { timeZone: true } });
    },

    getWorkOrder(workspaceId, workOrderId) {
      return prisma.workOrder.findFirst({
        where: { workspaceId, id: workOrderId },
        include: workOrderInclude,
      });
    },

    async createDirectWorkOrder({ workspaceId, actorUserId, data, snapshots }) {
      return prisma.$transaction(async (transaction) => {
        const number = await allocateWorkOrderNumber(transaction, workspaceId);
        const workOrder = await transaction.workOrder.create({
          data: {
            workspaceId,
            number,
            createdByUserId: actorUserId,
            customerId: data.customerId,
            propertyManagerId: data.propertyManagerId,
            propertyId: data.propertyId,
            serviceRequestId: data.serviceRequestId,
            billToNameSnapshot: snapshots.billToName,
            billToEmailSnapshot: snapshots.billToEmail,
            billToPhoneSnapshot: snapshots.billToPhone,
            propertyAddressSnapshot: snapshots.propertyAddress,
            title: data.title,
            scopeSnapshot: data.scopeSnapshot,
            pricingType: data.pricingType,
            agreedSubtotal: data.agreedTotal,
            agreedTotal: data.agreedTotal,
          },
        });
        await transaction.workOrderEvent.create({
          data: {
            workspaceId,
            workOrderId: workOrder.id,
            fromStatus: null,
            toStatus: 'PENDING_SCHEDULE',
            actorUserId,
          },
        });
        return transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrder.id },
          include: workOrderInclude,
        });
      });
    },

    async createFromAcceptedEstimate({ workspaceId, estimateId, actorUserId }) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const estimate = await transaction.estimate.findFirst({
            where: { workspaceId, id: estimateId },
            include: {
              customer: { select: { id: true } },
              propertyManager: { select: { id: true } },
              property: {
                select: {
                  id: true,
                  addressLine1: true,
                  addressLine2: true,
                  city: true,
                  state: true,
                  postalCode: true,
                  country: true,
                },
              },
              workOrder: { select: { id: true } },
              versions: {
                orderBy: { versionNumber: 'desc' },
                include: { lines: { orderBy: { position: 'asc' } } },
              },
            },
          });
          if (!estimate) return { error: 'NOT_FOUND' };
          if (estimate.workOrder) return { error: 'ALREADY_CONVERTED' };
          if (estimate.status !== 'ACCEPTED' || !estimate.latestSentVersionNumber) return { error: 'NOT_ACCEPTED' };
          const version = estimate.versions.find((item) => item.versionNumber === estimate.latestSentVersionNumber);
          if (!version?.acceptedAt || version.total == null) return { error: 'NOT_ACCEPTED' };

          const number = await allocateWorkOrderNumber(transaction, workspaceId);
          const property = estimate.property;
          const workOrder = await transaction.workOrder.create({
            data: {
              workspaceId,
              number,
              createdByUserId: actorUserId,
              customerId: estimate.customerId,
              propertyManagerId: estimate.propertyManagerId,
              propertyId: estimate.propertyId,
              serviceRequestId: estimate.serviceRequestId,
              estimateId: estimate.id,
              estimateVersionId: version.id,
              billToNameSnapshot: version.recipientNameSnapshot,
              billToEmailSnapshot: version.recipientEmailSnapshot,
              propertyAddressSnapshot: version.propertyAddressSnapshot,
              title: version.scopeSnapshot.slice(0, 200),
              scopeSnapshot: version.scopeSnapshot,
              pricingType: 'FIXED',
              agreedSubtotal: version.subtotal,
              discountAmount: version.discountAmount ?? '0.00',
              taxable: version.taxable,
              taxRate: version.taxRate,
              taxAmount: version.taxAmount ?? '0.00',
              agreedTotal: version.total,
              lines: {
                create: version.lines.map((line) => ({
                  workspaceId,
                  position: line.position,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  lineTotal: line.lineTotal,
                })),
              },
            },
          });
          await transaction.workOrderEvent.create({
            data: {
              workspaceId,
              workOrderId: workOrder.id,
              fromStatus: null,
              toStatus: 'PENDING_SCHEDULE',
              actorUserId,
            },
          });
          return {
            data: await transaction.workOrder.findFirst({
              where: { workspaceId, id: workOrder.id },
              include: workOrderInclude,
            }),
          };
        });
      } catch (error) {
        if (error?.code === 'P2002') return { error: 'ALREADY_CONVERTED' };
        throw error;
      }
    },

    async updateStatus({ workspaceId, workOrderId, actorUserId, status, reason, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true, status: true },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        const updated = await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId, status: workOrder.status },
          data: { status },
        });
        if (updated.count !== 1) return { error: 'CONFLICT' };
        await transaction.workOrderEvent.create({
          data: {
            workspaceId,
            workOrderId,
            fromStatus: workOrder.status,
            toStatus: status,
            actorUserId,
            reason,
            occurredAt,
          },
        });
        if (['COMPLETED', 'CANCELED'].includes(status)) {
          await transaction.workOrderAppointmentToken.updateMany({
            where: { workspaceId, workOrderId, consumedAt: null },
            data: { consumedAt: occurredAt },
          });
          const assignments = await transaction.workOrderAssignment.findMany({
            where: { workspaceId, workOrderId, revokedAt: null },
            select: { id: true },
          });
          await transaction.workOrderAccessCode.updateMany({
            where: { workspaceId, assignmentId: { in: assignments.map(({ id }) => id) }, revokedAt: null },
            data: { expiresAt: occurredAt, revokedAt: occurredAt },
          });
          await transaction.workOrderAssignment.updateMany({
            where: { workspaceId, workOrderId, revokedAt: null },
            data: { revokedAt: occurredAt, activeKey: null },
          });
        }
        return {
          data: await transaction.workOrder.findFirst({
            where: { workspaceId, id: workOrderId },
            include: workOrderInclude,
          }),
        };
      });
    },

    async updateSchedule({ workspaceId, workOrderId, actorUserId, startAt, endAt, durationMinutes, reason, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true, status: true, scheduledStartAt: true, scheduledEndAt: true, estimatedDurationMinutes: true },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        if (['COMPLETED', 'CANCELED'].includes(workOrder.status)) return { error: 'LOCKED' };

        const activeAssignments = await transaction.workOrderAssignment.findMany({
          where: { workspaceId, workOrderId, revokedAt: null },
          select: { employeeId: true, ownerUserId: true },
        });
        let conflicts = [];
        if (activeAssignments.length) {
          const overlapping = await transaction.workOrder.findMany({
            where: {
              workspaceId,
              id: { not: workOrderId },
              status: { not: 'CANCELED' },
              scheduledStartAt: { lt: endAt },
              scheduledEndAt: { gt: startAt },
            },
            orderBy: { scheduledStartAt: 'asc' },
            select: {
              id: true,
              number: true,
              title: true,
              status: true,
              scheduledStartAt: true,
              scheduledEndAt: true,
              assignments: {
                where: { revokedAt: null },
                select: { employeeId: true, ownerUserId: true },
              },
            },
          });
          conflicts = filterSharedResourceConflicts(activeAssignments, overlapping);
        }

        const nextStatus = ['PENDING_SCHEDULE', 'RESCHEDULED'].includes(workOrder.status)
          ? 'SCHEDULED'
          : workOrder.status;
        const updated = await transaction.workOrder.updateMany({
          where: {
            workspaceId,
            id: workOrderId,
            status: workOrder.status,
            scheduledStartAt: workOrder.scheduledStartAt,
            scheduledEndAt: workOrder.scheduledEndAt,
          },
          data: { scheduledStartAt: startAt, scheduledEndAt: endAt, estimatedDurationMinutes: durationMinutes, status: nextStatus },
        });
        if (updated.count !== 1) return { error: 'CONFLICT' };

        await transaction.workOrderScheduleEvent.create({
          data: {
            workspaceId,
            workOrderId,
            previousStartAt: workOrder.scheduledStartAt,
            previousEndAt: workOrder.scheduledEndAt,
            nextStartAt: startAt,
            nextEndAt: endAt,
            durationMinutes,
            actorUserId,
            reason,
            occurredAt,
          },
        });
        await transaction.workOrderAppointmentToken.updateMany({
          where: { workspaceId, workOrderId, consumedAt: null },
          data: { consumedAt: occurredAt },
        });
        if (workOrder.status !== nextStatus) {
          await transaction.workOrderEvent.create({
            data: {
              workspaceId,
              workOrderId,
              fromStatus: workOrder.status,
              toStatus: nextStatus,
              actorUserId,
              occurredAt,
            },
          });
        }

        return {
          data: await transaction.workOrder.findFirst({ where: { workspaceId, id: workOrderId }, include: workOrderInclude }),
          conflicts,
        };
      });
    },

    async updatePriority({ workspaceId, workOrderId, actorUserId, priority, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true, priority: true },
        });
        if (!current) return { error: 'NOT_FOUND' };
        if (current.priority === priority) {
          return { data: await transaction.workOrder.findFirst({ where: { workspaceId, id: workOrderId }, include: workOrderInclude }) };
        }
        const updated = await transaction.workOrder.updateMany({
          where: { workspaceId, id: workOrderId, priority: current.priority },
          data: { priority },
        });
        if (updated.count !== 1) return { error: 'CONFLICT' };
        await transaction.workOrderPriorityEvent.create({
          data: { workspaceId, workOrderId, from: current.priority, to: priority, actorUserId, occurredAt },
        });
        return { data: await transaction.workOrder.findFirst({ where: { workspaceId, id: workOrderId }, include: workOrderInclude }) };
      });
    },
  };
}
