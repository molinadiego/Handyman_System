const offlineEventInclude = {
  assignment: { include: { employee: { select: { id: true, name: true } } } },
  resolvedBy: { select: { id: true, email: true } },
};

function conflictReason({ code, assignment, workOrder, event, lastStage, expectedUpdatedAt }) {
  if (code.revokedAt || (code.expiresAt && code.expiresAt <= code.syncNow)) return 'ACCESS_REVOKED_WHILE_OFFLINE';
  if (assignment.revokedAt) return 'ASSIGNMENT_REVOKED_WHILE_OFFLINE';
  if (!assignment.employee?.isActive) return 'EMPLOYEE_INACTIVE';
  if (['CANCELED', 'COMPLETED'].includes(workOrder.status)) return 'WORK_ORDER_BECAME_TERMINAL';
  if (event.baseWorkOrderUpdatedAt.getTime() !== expectedUpdatedAt.getTime()) return 'WORK_ORDER_CHANGED_WHILE_OFFLINE';
  if (workOrder.status !== event.baseStatus) return 'WORK_ORDER_STATUS_CHANGED';
  const validProgress = !event.stage
    || (!lastStage && event.stage === 'STARTED')
    || (lastStage === 'STARTED' && event.stage === 'IN_PROGRESS')
    || (lastStage === 'IN_PROGRESS' && ['IN_PROGRESS', 'COMPLETED'].includes(event.stage));
  if (!validProgress) return 'PROGRESS_SEQUENCE_CONFLICT';
  return null;
}

export function createPrismaOfflineProgressRepository(prisma) {
  return {
    async syncEvents({ tokenHash, events, lockboxViews = [], now }) {
      const code = await prisma.workOrderAccessCode.findFirst({
        where: { tokenHash },
        include: {
          assignment: {
            include: {
              employee: { select: { id: true, isActive: true } },
              workOrder: { select: { id: true, status: true, updatedAt: true, propertyId: true } },
            },
          },
        },
      });
      if (!code || code.assignment.employeeId == null) return { error: 'ACCESS_CODE_UNKNOWN' };

      return prisma.$transaction(async (transaction) => {
        const latestCode = await transaction.workOrderAccessCode.findUnique({
          where: { id: code.id },
          include: {
            assignment: {
              include: {
                employee: { select: { id: true, isActive: true } },
                workOrder: { select: { id: true, status: true, updatedAt: true, propertyId: true } },
              },
            },
          },
        });
        if (!latestCode) return { error: 'ACCESS_CODE_UNKNOWN' };
        const { workspaceId, assignmentId, assignment } = latestCode;
        const startingWorkOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: assignment.workOrder.id },
          select: { id: true, status: true, updatedAt: true },
        });
        if (!startingWorkOrder) return { error: 'ACCESS_CODE_UNKNOWN' };
        const lock = await transaction.workOrder.updateMany({
          where: { workspaceId, id: startingWorkOrder.id, status: startingWorkOrder.status, updatedAt: startingWorkOrder.updatedAt },
          data: { updatedAt: startingWorkOrder.updatedAt },
        });
        const expectedUpdatedAt = startingWorkOrder.updatedAt;
        const results = [];

        for (const event of events) {
          const existing = await transaction.offlineProgressEvent.findUnique({
            where: { workspaceId_assignmentId_clientEventId: { workspaceId, assignmentId, clientEventId: event.clientEventId } },
            select: { id: true, clientEventId: true, syncStatus: true, conflictReason: true },
          });
          if (existing) {
            results.push(existing);
            continue;
          }

          const currentWorkOrder = await transaction.workOrder.findFirst({
            where: { workspaceId, id: assignment.workOrder.id },
            select: { id: true, status: true, updatedAt: true },
          });
          const lastProgress = await transaction.workOrderProgressEvent.findFirst({
            where: { workspaceId, assignmentId, stage: { not: null } },
            orderBy: { occurredAt: 'desc' },
            select: { stage: true },
          });
          const reason = conflictReason({
            code: { ...latestCode, syncNow: now },
            assignment,
            workOrder: currentWorkOrder,
            event,
            lastStage: lastProgress?.stage ?? null,
            expectedUpdatedAt,
          });
          const resolvedReason = lock.count ? reason : 'WORK_ORDER_CHANGED_WHILE_OFFLINE';

          let syncStatus = resolvedReason ? 'REVIEW_REQUIRED' : 'APPLIED';
          let conflict = resolvedReason;
          if (!resolvedReason) {
            let updated = { count: 1 };
            if (event.baseStatus !== event.requestedStatus) {
              updated = await transaction.workOrder.updateMany({
                where: { workspaceId, id: currentWorkOrder.id, status: event.baseStatus },
                data: { status: event.requestedStatus },
              });
            }
            if (!updated.count) {
              syncStatus = 'REVIEW_REQUIRED';
              conflict = 'WORK_ORDER_STATUS_CHANGED';
            } else {
              if (event.baseStatus !== event.requestedStatus) {
                await transaction.workOrderEvent.create({
                  data: {
                    workspaceId,
                    workOrderId: currentWorkOrder.id,
                    fromStatus: event.baseStatus,
                    toStatus: event.requestedStatus,
                    actorAssignmentId: assignmentId,
                    occurredAt: now,
                  },
                });
              }
              await transaction.workOrderProgressEvent.create({
                data: {
                  workspaceId,
                  workOrderId: currentWorkOrder.id,
                  assignmentId,
                  stage: event.stage,
                  note: event.note,
                  occurredAt: now,
                },
              });
              if (event.requestedStatus === 'COMPLETED') {
                const assignments = await transaction.workOrderAssignment.findMany({
                  where: { workspaceId, workOrderId: currentWorkOrder.id, revokedAt: null },
                  select: { id: true },
                });
                await transaction.workOrderAccessCode.updateMany({
                  where: { workspaceId, assignmentId: { in: assignments.map(({ id }) => id) }, revokedAt: null },
                  data: { revokedAt: now, expiresAt: now },
                });
                await transaction.workOrderAssignment.updateMany({
                  where: { workspaceId, workOrderId: currentWorkOrder.id, revokedAt: null },
                  data: { revokedAt: now, activeKey: null },
                });
              }
            }
          }

          const saved = await transaction.offlineProgressEvent.create({
            data: {
              workspaceId,
              workOrderId: assignment.workOrder.id,
              assignmentId,
              clientEventId: event.clientEventId,
              stage: event.stage,
              note: event.note,
              baseStatus: event.baseStatus,
              baseWorkOrderUpdatedAt: event.baseWorkOrderUpdatedAt,
              requestedStatus: event.requestedStatus,
              deviceOccurredAt: event.deviceOccurredAt,
              receivedAt: now,
              syncStatus,
              conflictReason: conflict,
            },
            select: { id: true, clientEventId: true, syncStatus: true, conflictReason: true },
          });
          results.push(saved);
        }

        const currentWorkOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: assignment.workOrder.id },
          select: { status: true, updatedAt: true },
        });
        const lockboxResults = [];
        for (const view of lockboxViews) {
          const existing = await transaction.workOrderSensitiveDataAccessEvent.findFirst({
            where: { workspaceId, assignmentId, clientEventId: view.clientEventId },
            select: { id: true, clientEventId: true, reviewStatus: true, conflictReason: true },
          });
          if (existing) {
            lockboxResults.push(existing);
            continue;
          }
          const credential = await transaction.propertyAccessCredential.findFirst({
            where: { workspaceId, propertyId: assignment.workOrder.propertyId, id: view.credentialId },
            select: { id: true, isActive: true },
          });
          if (!credential) return { error: 'OFFLINE_CREDENTIAL_INVALID' };

          const accessActive = !latestCode.revokedAt
            && (!latestCode.expiresAt || latestCode.expiresAt > now)
            && !assignment.revokedAt
            && assignment.employee?.isActive
            && !['COMPLETED', 'CANCELED'].includes(assignment.workOrder.status)
            && credential.isActive;
          const accessEvent = await transaction.workOrderSensitiveDataAccessEvent.create({
            data: {
              workspaceId,
              credentialId: view.credentialId,
              assignmentId,
              clientEventId: view.clientEventId,
              deviceOccurredAt: view.deviceOccurredAt,
              occurredAt: now,
              wasOffline: true,
              reviewStatus: accessActive ? 'APPLIED' : 'REVIEW_REQUIRED',
              conflictReason: accessActive ? null : 'ACCESS_REVOKED_OR_CREDENTIAL_CHANGED_WHILE_OFFLINE',
            },
            select: { id: true, clientEventId: true, reviewStatus: true, conflictReason: true },
          });
          lockboxResults.push(accessEvent);
        }

        const finalAccess = await transaction.workOrderAccessCode.findFirst({
          where: { id: latestCode.id },
          include: {
            assignment: {
              include: {
                employee: { select: { isActive: true } },
                workOrder: { select: { status: true } },
              },
            },
          },
        });
        const active = Boolean(finalAccess
          && !finalAccess.revokedAt
          && (!finalAccess.expiresAt || finalAccess.expiresAt > now)
          && !finalAccess.assignment.revokedAt
          && finalAccess.assignment.employee?.isActive
          && !['COMPLETED', 'CANCELED'].includes(finalAccess.assignment.workOrder.status));
        return {
          data: {
            results,
            lockboxResults,
            purgeLocal: !active,
            currentStatus: currentWorkOrder.status,
            currentUpdatedAt: currentWorkOrder.updatedAt,
          },
        };
      });
    },

    listForOwner(workspaceId, workOrderId) {
      return prisma.offlineProgressEvent.findMany({
        where: { workspaceId, workOrderId },
        orderBy: { receivedAt: 'asc' },
        include: offlineEventInclude,
      });
    },

    listSensitiveAccessForOwner(workspaceId, workOrderId) {
      return prisma.workOrderSensitiveDataAccessEvent.findMany({
        where: { workspaceId, wasOffline: true, assignment: { is: { workOrderId } } },
        orderBy: { receivedAt: 'asc' },
        include: {
          credential: { select: { id: true, label: true, type: true } },
          assignment: { include: { employee: { select: { id: true, name: true } } } },
          resolvedBy: { select: { id: true, email: true } },
        },
      });
    },

    async resolveSensitiveAccessForOwner({ workspaceId, workOrderId, eventId, actorUserId, decision, reason, now }) {
      const request = await prisma.workOrderSensitiveDataAccessEvent.updateMany({
        where: {
          workspaceId,
          id: eventId,
          wasOffline: true,
          reviewStatus: 'REVIEW_REQUIRED',
          assignment: { is: { workOrderId } },
        },
        data: {
          reviewStatus: decision === 'ACKNOWLEDGE' ? 'OWNER_ACKNOWLEDGED' : 'DISMISSED',
          resolvedAt: now,
          resolvedByUserId: actorUserId,
          resolutionReason: reason,
        },
      });
      if (!request.count) return { error: 'NOT_FOUND_OR_RESOLVED' };
      return {
        data: await prisma.workOrderSensitiveDataAccessEvent.findFirst({
          where: { workspaceId, id: eventId },
          include: {
            credential: { select: { id: true, label: true, type: true } },
            assignment: { include: { employee: { select: { id: true, name: true } } } },
            resolvedBy: { select: { id: true, email: true } },
          },
        }),
      };
    },

    async resolveForOwner({ workspaceId, workOrderId, eventId, actorUserId, decision, reason, now }) {
      return prisma.$transaction(async (transaction) => {
        const event = await transaction.offlineProgressEvent.findFirst({
          where: { workspaceId, workOrderId, id: eventId, syncStatus: 'REVIEW_REQUIRED' },
          include: { workOrder: { select: { id: true, status: true } } },
        });
        if (!event) return { error: 'NOT_FOUND_OR_RESOLVED' };
        let nextStatus = 'DISMISSED';
        if (decision === 'APPLY') {
          if (['COMPLETED', 'CANCELED'].includes(event.workOrder.status)) return { error: 'WORK_ORDER_TERMINAL' };
          const updated = await transaction.workOrder.updateMany({
            where: { workspaceId, id: workOrderId, status: event.workOrder.status },
            data: { status: event.requestedStatus },
          });
          if (!updated.count) return { error: 'CONFLICT' };
          if (event.workOrder.status !== event.requestedStatus) {
            await transaction.workOrderEvent.create({
              data: {
                workspaceId,
                workOrderId,
                fromStatus: event.workOrder.status,
                toStatus: event.requestedStatus,
                actorUserId,
                reason,
                occurredAt: now,
              },
            });
          }
          await transaction.workOrderProgressEvent.create({
            data: {
              workspaceId,
              workOrderId,
              assignmentId: event.assignmentId,
              stage: event.stage,
              note: event.note,
              occurredAt: now,
            },
          });
          if (event.requestedStatus === 'COMPLETED') {
            const assignments = await transaction.workOrderAssignment.findMany({
              where: { workspaceId, workOrderId, revokedAt: null },
              select: { id: true },
            });
            await transaction.workOrderAccessCode.updateMany({
              where: { workspaceId, assignmentId: { in: assignments.map(({ id }) => id) }, revokedAt: null },
              data: { revokedAt: now, expiresAt: now },
            });
            await transaction.workOrderAssignment.updateMany({
              where: { workspaceId, workOrderId, revokedAt: null },
              data: { revokedAt: now, activeKey: null },
            });
          }
          nextStatus = 'OWNER_APPLIED';
        }
        const updatedEvent = await transaction.offlineProgressEvent.updateMany({
          where: { workspaceId, workOrderId, id: eventId, syncStatus: 'REVIEW_REQUIRED' },
          data: { syncStatus: nextStatus, resolvedAt: now, resolvedByUserId: actorUserId, resolutionReason: reason },
        });
        if (!updatedEvent.count) return { error: 'NOT_FOUND_OR_RESOLVED' };
        return {
          data: await transaction.offlineProgressEvent.findFirst({
            where: { workspaceId, workOrderId, id: eventId },
            include: offlineEventInclude,
          }),
        };
      });
    },
  };
}
