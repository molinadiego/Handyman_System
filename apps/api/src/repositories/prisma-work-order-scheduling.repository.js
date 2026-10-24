import { filterSharedResourceConflicts } from '../models/work-order-schedule.model.js';

const contactSelect = {
  id: true,
  type: true,
  name: true,
  email: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
};

const requestInclude = {
  events: { orderBy: { occurredAt: 'asc' } },
};

const appointmentOrderSelect = {
  id: true,
  number: true,
  title: true,
  status: true,
  scheduledStartAt: true,
  scheduledEndAt: true,
  estimatedDurationMinutes: true,
  propertyAddressSnapshot: true,
  workspace: { select: { timeZone: true } },
  contact: { select: { name: true, type: true, email: true } },
};

export function createPrismaWorkOrderSchedulingRepository(prisma) {
  return {
    getWorkOrderContact(workspaceId, workOrderId) {
      return prisma.workOrderContact.findFirst({
        where: { workspaceId, workOrderId },
        select: contactSelect,
      });
    },

    async saveWorkOrderContact({ workspaceId, workOrderId, actorUserId, data, now }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        const current = await transaction.workOrderContact.findFirst({
          where: { workspaceId, workOrderId },
          select: contactSelect,
        });
        const contact = await transaction.workOrderContact.upsert({
          where: { workspaceId_workOrderId: { workspaceId, workOrderId } },
          create: { workspaceId, workOrderId, createdByUserId: actorUserId, ...data },
          update: data,
          select: contactSelect,
        });
        const changed = !current || current.email !== contact.email || current.name !== contact.name || current.type !== contact.type;
        if (changed) {
          await transaction.workOrderAppointmentToken.updateMany({
            where: { workspaceId, workOrderId, consumedAt: null },
            data: { consumedAt: now },
          });
        }
        return { data: contact };
      });
    },

    async prepareAppointmentRequestLink({ workspaceId, workOrderId, actorUserId, tokenHash, recipientName, recipientEmail, now }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: {
            ...appointmentOrderSelect,
            estimateId: true,
          },
        });
        if (!workOrder) return { error: 'NOT_FOUND' };
        if (!['SCHEDULED', 'RESCHEDULED'].includes(workOrder.status) || !workOrder.scheduledStartAt || !workOrder.scheduledEndAt) {
          return { error: 'NOT_SCHEDULED' };
        }
        if (workOrder.scheduledStartAt <= now) return { error: 'APPOINTMENT_STARTED' };

        await transaction.workOrderAppointmentToken.updateMany({
          where: { workspaceId, workOrderId, consumedAt: null },
          data: { consumedAt: now },
        });
        const token = await transaction.workOrderAppointmentToken.create({
          data: {
            workspaceId,
            workOrderId,
            tokenHash,
            recipientNameSnapshot: recipientName,
            recipientEmailSnapshot: recipientEmail,
            scheduledStartAtSnapshot: workOrder.scheduledStartAt,
            scheduledEndAtSnapshot: workOrder.scheduledEndAt,
            expiresAt: workOrder.scheduledStartAt,
            createdByUserId: actorUserId,
          },
          select: { id: true, expiresAt: true },
        });
        return { workOrder, token };
      });
    },

    async revokeAppointmentToken({ workspaceId, tokenId, now }) {
      await prisma.workOrderAppointmentToken.updateMany({
        where: { workspaceId, id: tokenId, consumedAt: null },
        data: { consumedAt: now },
      });
    },

    createAppointmentCommunication({ workspaceId, workOrderId, recipient, status, failureCode }) {
      return prisma.workOrderCommunication.create({
        data: {
          workspaceId,
          workOrderId,
          kind: 'APPOINTMENT_CHANGE_LINK',
          channel: 'EMAIL',
          recipient,
          status,
          failureCode: failureCode ?? null,
        },
        select: { id: true, status: true, createdAt: true },
      });
    },

    async previewAppointmentToken({ tokenHash, now }) {
      const token = await prisma.workOrderAppointmentToken.findFirst({
        where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
        include: { workOrder: { select: appointmentOrderSelect } },
      });
      if (!token || !token.workOrder || !['SCHEDULED', 'RESCHEDULED'].includes(token.workOrder.status)
        || !token.workOrder.scheduledStartAt || !token.workOrder.scheduledEndAt
        || token.workOrder.scheduledStartAt.getTime() !== token.scheduledStartAtSnapshot.getTime()
        || token.workOrder.scheduledEndAt.getTime() !== token.scheduledEndAtSnapshot.getTime()) return null;
      return {
        workOrderNumber: token.workOrder.number,
        title: token.workOrder.title,
        propertyAddress: token.workOrder.propertyAddressSnapshot,
        scheduledStartAt: token.workOrder.scheduledStartAt,
        scheduledEndAt: token.workOrder.scheduledEndAt,
        durationMinutes: token.workOrder.estimatedDurationMinutes,
        timeZone: token.workOrder.workspace.timeZone,
        requesterName: token.recipientNameSnapshot,
      };
    },

    async submitScheduleChangeRequest({ tokenHash, type, reason, proposedStartAt, now }) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.workOrderAppointmentToken.findFirst({
          where: { tokenHash, consumedAt: null, expiresAt: { gt: now } },
          include: { workOrder: { select: appointmentOrderSelect } },
        });
        if (!token || !token.workOrder || !['SCHEDULED', 'RESCHEDULED'].includes(token.workOrder.status)
          || !token.workOrder.scheduledStartAt || !token.workOrder.scheduledEndAt
          || token.workOrder.scheduledStartAt.getTime() !== token.scheduledStartAtSnapshot.getTime()
          || token.workOrder.scheduledEndAt.getTime() !== token.scheduledEndAtSnapshot.getTime()) {
          return { error: 'INVALID_OR_EXPIRED' };
        }
        const consumed = await transaction.workOrderAppointmentToken.updateMany({
          where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (!consumed.count) return { error: 'INVALID_OR_EXPIRED' };

        const requestStatus = type === 'CONFIRM' ? 'CONFIRMED' : 'PENDING';
        const eventType = type === 'CONFIRM' ? 'CONFIRMED' : 'REQUESTED';
        const request = await transaction.scheduleChangeRequest.create({
          data: {
            workspaceId: token.workspaceId,
            workOrderId: token.workOrderId,
            appointmentTokenId: token.id,
            type,
            status: requestStatus,
            requesterName: token.recipientNameSnapshot,
            requesterEmailSnapshot: token.recipientEmailSnapshot,
            reason,
            scheduledStartAtSnapshot: token.scheduledStartAtSnapshot,
            scheduledEndAtSnapshot: token.scheduledEndAtSnapshot,
            proposedStartAt,
          },
        });
        await transaction.scheduleChangeRequestEvent.create({
          data: {
            workspaceId: token.workspaceId,
            requestId: request.id,
            fromStatus: null,
            toStatus: requestStatus,
            type: eventType,
            actorNameSnapshot: token.recipientNameSnapshot,
            reason,
            occurredAt: now,
          },
        });
        return {
          data: { id: request.id, type: request.type, status: request.status, workOrderNumber: token.workOrder.number },
        };
      });
    },

    listScheduleChangeRequests(workspaceId, workOrderId) {
      return prisma.scheduleChangeRequest.findMany({
        where: { workspaceId, workOrderId },
        orderBy: { createdAt: 'desc' },
        include: requestInclude,
      });
    },

    async decideScheduleChange({ workspaceId, workOrderId, requestId, actorUserId, decision, decisionReason, now }) {
      return prisma.$transaction(async (transaction) => {
        const request = await transaction.scheduleChangeRequest.findFirst({
          where: { workspaceId, workOrderId, id: requestId, status: 'PENDING' },
          include: {
            workOrder: {
              select: {
                id: true,
                status: true,
                scheduledStartAt: true,
                scheduledEndAt: true,
                estimatedDurationMinutes: true,
                updatedAt: true,
              },
            },
          },
        });
        if (!request) return { error: 'NOT_FOUND_OR_NOT_PENDING' };
        if (request.workOrder.scheduledStartAt?.getTime() !== request.scheduledStartAtSnapshot.getTime()
          || request.workOrder.scheduledEndAt?.getTime() !== request.scheduledEndAtSnapshot.getTime()) {
          return { error: 'STALE_REQUEST' };
        }
        const locked = await transaction.workOrder.updateMany({
          where: {
            workspaceId,
            id: workOrderId,
            status: request.workOrder.status,
            scheduledStartAt: request.scheduledStartAtSnapshot,
            scheduledEndAt: request.scheduledEndAtSnapshot,
          },
          data: { updatedAt: request.workOrder.updatedAt },
        });
        if (!locked.count) return { error: 'STALE_REQUEST' };

        let conflicts = [];
        let requestStatus = 'REJECTED';
        if (decision === 'APPROVE') {
          requestStatus = 'APPROVED';
          if (request.type === 'CANCEL') {
            const updated = await transaction.workOrder.updateMany({
              where: { workspaceId, id: workOrderId, status: request.workOrder.status },
              data: { status: 'CANCELED' },
            });
            if (!updated.count) return { error: 'STALE_REQUEST' };
            await transaction.workOrderAppointmentToken.updateMany({
              where: { workspaceId, workOrderId, consumedAt: null },
              data: { consumedAt: now },
            });
            await transaction.workOrderEvent.create({
              data: {
                workspaceId,
                workOrderId,
                fromStatus: request.workOrder.status,
                toStatus: 'CANCELED',
                actorUserId,
                reason: request.reason,
                occurredAt: now,
              },
            });
            const assignments = await transaction.workOrderAssignment.findMany({
              where: { workspaceId, workOrderId, revokedAt: null },
              select: { id: true },
            });
            await transaction.workOrderAccessCode.updateMany({
              where: { workspaceId, assignmentId: { in: assignments.map(({ id }) => id) }, revokedAt: null },
              data: { expiresAt: now, revokedAt: now },
            });
            await transaction.workOrderAssignment.updateMany({
              where: { workspaceId, workOrderId, revokedAt: null },
              data: { revokedAt: now, activeKey: null },
            });
          } else {
            const workOrder = await transaction.workOrder.findFirst({
              where: { workspaceId, id: workOrderId },
              select: { scheduledEndAt: true, estimatedDurationMinutes: true, status: true },
            });
            if (!request.proposedStartAt || !workOrder.estimatedDurationMinutes) return { error: 'RESCHEDULE_DATA_MISSING' };
            const nextEndAt = new Date(request.proposedStartAt.getTime() + workOrder.estimatedDurationMinutes * 60_000);
            const activeAssignments = await transaction.workOrderAssignment.findMany({
              where: { workspaceId, workOrderId, revokedAt: null },
              select: { employeeId: true, ownerUserId: true },
            });
            if (activeAssignments.length) {
              const overlapping = await transaction.workOrder.findMany({
                where: {
                  workspaceId,
                  id: { not: workOrderId },
                  status: { not: 'CANCELED' },
                  scheduledStartAt: { lt: nextEndAt },
                  scheduledEndAt: { gt: request.proposedStartAt },
                },
                orderBy: { scheduledStartAt: 'asc' },
                select: {
                  id: true,
                  number: true,
                  title: true,
                  status: true,
                  scheduledStartAt: true,
                  scheduledEndAt: true,
                  assignments: { where: { revokedAt: null }, select: { employeeId: true, ownerUserId: true } },
                },
              });
              conflicts = filterSharedResourceConflicts(activeAssignments, overlapping);
            }
            const updated = await transaction.workOrder.updateMany({
              where: { workspaceId, id: workOrderId, status: workOrder.status, scheduledStartAt: request.scheduledStartAtSnapshot },
              data: { scheduledStartAt: request.proposedStartAt, scheduledEndAt: nextEndAt, status: 'RESCHEDULED' },
            });
            if (!updated.count) return { error: 'STALE_REQUEST' };
            await transaction.workOrderAppointmentToken.updateMany({
              where: { workspaceId, workOrderId, consumedAt: null },
              data: { consumedAt: now },
            });
            await transaction.workOrderScheduleEvent.create({
              data: {
                workspaceId,
                workOrderId,
                previousStartAt: request.scheduledStartAtSnapshot,
                previousEndAt: workOrder.scheduledEndAt,
                nextStartAt: request.proposedStartAt,
                nextEndAt,
                durationMinutes: workOrder.estimatedDurationMinutes,
                actorUserId,
                reason: request.reason,
                occurredAt: now,
              },
            });
            if (workOrder.status !== 'RESCHEDULED') {
              await transaction.workOrderEvent.create({
                data: {
                  workspaceId,
                  workOrderId,
                  fromStatus: workOrder.status,
                  toStatus: 'RESCHEDULED',
                  actorUserId,
                  reason: request.reason,
                  occurredAt: now,
                },
              });
            }
          }
        }

        const updatedRequest = await transaction.scheduleChangeRequest.updateMany({
          where: { workspaceId, workOrderId, id: requestId, status: 'PENDING' },
          data: { status: requestStatus, decidedByUserId: actorUserId, decidedAt: now, decisionReason },
        });
        if (!updatedRequest.count) return { error: 'NOT_FOUND_OR_NOT_PENDING' };
        await transaction.scheduleChangeRequestEvent.create({
          data: {
            workspaceId,
            requestId,
            fromStatus: 'PENDING',
            toStatus: requestStatus,
            type: requestStatus,
            actorUserId,
            reason: decisionReason,
            occurredAt: now,
          },
        });
        return {
          data: await transaction.scheduleChangeRequest.findFirst({ where: { workspaceId, id: requestId }, include: requestInclude }),
          conflicts,
        };
      });
    },
  };
}
