const employeeAccessSelect = {
  id: true,
  name: true,
  canUpdateProgress: true,
  canAddNotes: true,
  canUploadPhotos: true,
  canUploadVideos: true,
  isActive: true,
};

const assignmentInclude = {
  employee: { select: { id: true, name: true, email: true, phone: true, calendarColor: true, canUpdateProgress: true, canAddNotes: true, canUploadPhotos: true, canUploadVideos: true, isActive: true } },
  owner: { select: { id: true, email: true } },
  accessCodes: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, createdAt: true, expiresAt: true, revokedAt: true },
  },
  communications: { orderBy: { createdAt: 'desc' } },
  progressEvents: { orderBy: { occurredAt: 'desc' } },
};

const accessCodeInclude = {
  assignment: {
    include: {
      employee: { select: employeeAccessSelect },
      workOrder: {
        include: {
          property: {
            select: {
              id: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
              accessData: {
                where: { isActive: true, type: 'LOCKBOX' },
                orderBy: { createdAt: 'desc' },
                select: { id: true, type: true, label: true },
              },
            },
          },
          lines: { orderBy: { position: 'asc' } },
          progressEvents: { orderBy: { occurredAt: 'asc' } },
          additionalWork: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'asc' },
            select: { id: true, title: true, description: true },
          },
          workspace: { select: { timeZone: true } },
        },
      },
    },
  },
};

function publicAssignment(assignment) {
  if (!assignment) return null;
  const { activeKey, ...safe } = assignment;
  return safe;
}

async function lockValidAccess(transaction, code, now) {
  const workOrder = code.assignment.workOrder;
  const workOrderLock = await transaction.workOrder.updateMany({
    where: { workspaceId: code.workspaceId, id: workOrder.id, status: workOrder.status },
    data: { updatedAt: workOrder.updatedAt },
  });
  if (workOrderLock.count !== 1 || ['COMPLETED', 'CANCELED'].includes(workOrder.status)) return false;

  const assignmentLock = await transaction.workOrderAssignment.updateMany({
    where: { workspaceId: code.workspaceId, id: code.assignmentId, revokedAt: null },
    data: { activeKey: code.assignment.activeKey },
  });
  if (assignmentLock.count !== 1) return false;

  const codeLock = await transaction.workOrderAccessCode.updateMany({
    where: {
      id: code.id,
      tokenHash: code.tokenHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: { revokedAt: null },
  });
  return codeLock.count === 1;
}

export function createPrismaWorkOrderAssignmentRepository(prisma) {
  return {
    listAssignments(workspaceId, workOrderId) {
      return prisma.workOrderAssignment.findMany({
        where: { workspaceId, workOrderId },
        orderBy: { assignedAt: 'desc' },
        include: assignmentInclude,
      }).then((assignments) => assignments.map(publicAssignment));
    },

    getAssignment(workspaceId, assignmentId) {
      return prisma.workOrderAssignment.findFirst({
        where: { workspaceId, id: assignmentId },
        include: assignmentInclude,
      }).then(publicAssignment);
    },

    async createAssignment({ workspaceId, workOrderId, employeeId, actorUserId, activeKey, tokenHash, now }) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const workOrder = await transaction.workOrder.findFirst({
            where: { workspaceId, id: workOrderId },
            select: { id: true, number: true, status: true },
          });
          if (!workOrder) return { error: 'NOT_FOUND' };
          if (['COMPLETED', 'CANCELED'].includes(workOrder.status)) return { error: 'WORK_ORDER_LOCKED' };
          const employee = await transaction.employee.findFirst({
            where: { workspaceId, id: employeeId, isActive: true },
            select: { id: true, email: true, name: true },
          });
          if (!employee) return { error: 'EMPLOYEE_NOT_FOUND' };
          if (!employee.email) return { error: 'EMPLOYEE_EMAIL_REQUIRED' };
          const existing = await transaction.workOrderAssignment.findFirst({
            where: { workspaceId, workOrderId, employeeId, revokedAt: null },
            select: { id: true },
          });
          if (existing) return { error: 'OWNER_ASSIGNMENT_EXISTS' };

          const assignment = await transaction.workOrderAssignment.create({
            data: { workspaceId, workOrderId, employeeId, assignedByUserId: actorUserId, activeKey, assignedAt: now },
          });
          const accessCode = await transaction.workOrderAccessCode.create({
            data: { workspaceId, assignmentId: assignment.id, tokenHash, createdByUserId: actorUserId },
            select: { id: true },
          });
          return {
            assignment: publicAssignment(await transaction.workOrderAssignment.findFirst({
              where: { workspaceId, id: assignment.id },
              include: assignmentInclude,
            })),
            accessCodeId: accessCode.id,
            employee,
            workOrder,
          };
        });
      } catch (error) {
        if (error?.code === 'P2002') return { error: 'OWNER_ASSIGNMENT_EXISTS' };
        throw error;
      }
    },

    async createOwnerAssignment({ workspaceId, workOrderId, actorUserId, activeKey, now }) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const workspace = await transaction.workspace.findFirst({
            where: { id: workspaceId, ownerUserId: actorUserId },
            select: { id: true },
          });
          if (!workspace) return { error: 'NOT_FOUND' };
          const workOrder = await transaction.workOrder.findFirst({
            where: { workspaceId, id: workOrderId },
            select: { id: true, status: true },
          });
          if (!workOrder) return { error: 'NOT_FOUND' };
          if (['COMPLETED', 'CANCELED'].includes(workOrder.status)) return { error: 'WORK_ORDER_LOCKED' };
          const existing = await transaction.workOrderAssignment.findFirst({
            where: { workspaceId, workOrderId, ownerUserId: actorUserId, revokedAt: null },
            select: { id: true },
          });
          if (existing) return { error: 'ASSIGNMENT_EXISTS' };
          const assignment = await transaction.workOrderAssignment.create({
            data: {
              workspaceId,
              workOrderId,
              ownerUserId: actorUserId,
              employeeId: null,
              assignedByUserId: actorUserId,
              activeKey,
              assignedAt: now,
            },
          });
          return {
            assignment: publicAssignment(await transaction.workOrderAssignment.findFirst({
              where: { workspaceId, id: assignment.id },
              include: assignmentInclude,
            })),
          };
        });
      } catch (error) {
        if (error?.code === 'P2002') return { error: 'ASSIGNMENT_EXISTS' };
        throw error;
      }
    },

    async issueNewAccessCode({ workspaceId, assignmentId, actorUserId, tokenHash, now }) {
      return prisma.$transaction(async (transaction) => {
        const assignment = await transaction.workOrderAssignment.findFirst({
          where: { workspaceId, id: assignmentId, revokedAt: null },
          include: {
            employee: { select: { id: true, name: true, email: true, isActive: true } },
            workOrder: { select: { id: true, number: true, status: true } },
          },
        });
        if (!assignment) return { error: 'NOT_FOUND' };
        if (!assignment.employee) return { error: 'NOT_EMPLOYEE_ASSIGNMENT' };
        if (!assignment.employee.isActive) return { error: 'EMPLOYEE_NOT_FOUND' };
        if (!assignment.employee.email) return { error: 'EMPLOYEE_EMAIL_REQUIRED' };
        if (['COMPLETED', 'CANCELED'].includes(assignment.workOrder.status)) return { error: 'WORK_ORDER_LOCKED' };

        await transaction.workOrderAccessCode.updateMany({
          where: { workspaceId, assignmentId, revokedAt: null },
          data: { revokedAt: now },
        });
        const accessCode = await transaction.workOrderAccessCode.create({
          data: { workspaceId, assignmentId, tokenHash, createdByUserId: actorUserId },
          select: { id: true },
        });
        return { assignment, accessCodeId: accessCode.id };
      });
    },

    recordAssignmentCommunication({ workspaceId, assignmentId, recipient, status, failureCode }) {
      return prisma.workOrderAssignmentCommunication.create({
        data: { workspaceId, assignmentId, channel: 'EMAIL', recipient, status, failureCode: failureCode ?? null },
        select: { id: true, status: true, createdAt: true },
      });
    },

    async revokeAccessCode({ workspaceId, accessCodeId, now }) {
      await prisma.workOrderAccessCode.updateMany({
        where: { workspaceId, id: accessCodeId, revokedAt: null },
        data: { revokedAt: now },
      });
    },

    async revokeAssignment({ workspaceId, assignmentId, now }) {
      return prisma.$transaction(async (transaction) => {
        const updated = await transaction.workOrderAssignment.updateMany({
          where: { workspaceId, id: assignmentId, revokedAt: null },
          data: { revokedAt: now, activeKey: null },
        });
        if (!updated.count) return null;
        await transaction.workOrderAccessCode.updateMany({
          where: { workspaceId, assignmentId, revokedAt: null },
          data: { revokedAt: now },
        });
        return transaction.workOrderAssignment.findFirst({
          where: { workspaceId, id: assignmentId },
          include: assignmentInclude,
        }).then(publicAssignment);
      });
    },

    async findActiveAccessByTokenHash(tokenHash, now) {
      const accessCode = await prisma.workOrderAccessCode.findFirst({
        where: {
          tokenHash,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        include: accessCodeInclude,
      });
      const assignment = accessCode?.assignment;
      if (!assignment || assignment.revokedAt || !assignment.employee?.isActive
        || ['COMPLETED', 'CANCELED'].includes(assignment.workOrder.status)) return null;
      return {
        accessCodeId: accessCode.id,
        workspaceId: accessCode.workspaceId,
        expiresAt: accessCode.expiresAt,
        assignmentId: assignment.id,
        employee: assignment.employee,
        workOrder: assignment.workOrder,
      };
    },

    async recordProgressFromAccess({ tokenHash, stage, note, now }) {
      return prisma.$transaction(async (transaction) => {
        const code = await transaction.workOrderAccessCode.findFirst({
          where: {
            tokenHash,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          include: {
            assignment: {
              include: {
                employee: { select: { isActive: true, canUpdateProgress: true, canAddNotes: true } },
                workOrder: { select: { id: true, status: true, updatedAt: true } },
              },
            },
          },
        });
        if (!code || code.assignment.revokedAt || !code.assignment.employee?.isActive
          || ['COMPLETED', 'CANCELED'].includes(code.assignment.workOrder.status)) return { error: 'ACCESS_INVALID' };
        if (stage && !code.assignment.employee.canUpdateProgress) return { error: 'PROGRESS_FORBIDDEN' };
        if (note && !code.assignment.employee.canAddNotes) return { error: 'NOTES_FORBIDDEN' };
        if (!(await lockValidAccess(transaction, code, now))) return { error: 'ACCESS_INVALID' };

        const last = await transaction.workOrderProgressEvent.findFirst({
          where: { workspaceId: code.workspaceId, assignmentId: code.assignmentId, stage: { not: null } },
          orderBy: { occurredAt: 'desc' },
          select: { stage: true },
        });
        const validNext = !stage
          || (!last && stage === 'STARTED')
          || (last?.stage === 'STARTED' && stage === 'IN_PROGRESS')
          || (last?.stage === 'IN_PROGRESS' && ['IN_PROGRESS', 'COMPLETED'].includes(stage));
        if (!validNext) return { error: 'PROGRESS_TRANSITION_INVALID' };

        if (stage) {
          const nextStatus = stage === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
          const currentStatus = code.assignment.workOrder.status;
          if (currentStatus !== nextStatus) {
            const updated = await transaction.workOrder.updateMany({
              where: { workspaceId: code.workspaceId, id: code.assignment.workOrder.id, status: currentStatus },
              data: { status: nextStatus },
            });
            if (!updated.count) return { error: 'WORK_ORDER_CONFLICT' };
            await transaction.workOrderEvent.create({
              data: {
                workspaceId: code.workspaceId,
                workOrderId: code.assignment.workOrder.id,
                fromStatus: currentStatus,
                toStatus: nextStatus,
                actorAssignmentId: code.assignmentId,
                occurredAt: now,
              },
            });
          }
        }

        if (stage === 'COMPLETED') {
          const assignmentIds = await transaction.workOrderAssignment.findMany({
            where: { workspaceId: code.workspaceId, workOrderId: code.assignment.workOrder.id, revokedAt: null },
            select: { id: true },
          });
          await transaction.workOrderAccessCode.updateMany({
            where: { workspaceId: code.workspaceId, assignmentId: { in: assignmentIds.map(({ id }) => id) }, revokedAt: null },
            data: { expiresAt: now, revokedAt: now },
          });
          await transaction.workOrderAssignment.updateMany({
            where: { workspaceId: code.workspaceId, workOrderId: code.assignment.workOrder.id, revokedAt: null },
            data: { revokedAt: now, activeKey: null },
          });
        }
        const event = await transaction.workOrderProgressEvent.create({
          data: {
            workspaceId: code.workspaceId,
            workOrderId: code.assignment.workOrder.id,
            assignmentId: code.assignmentId,
            stage,
            note,
            occurredAt: now,
          },
        });
        return { data: event };
      });
    },

    async recordSensitiveAccessFromCode({ tokenHash, credentialId, now }) {
      return prisma.$transaction(async (transaction) => {
        const code = await transaction.workOrderAccessCode.findFirst({
          where: {
            tokenHash,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          include: {
            assignment: { include: { employee: { select: { isActive: true } }, workOrder: { select: { id: true, status: true, propertyId: true, updatedAt: true } } } },
          },
        });
        if (!code || code.assignment.revokedAt || !code.assignment.employee?.isActive
          || ['COMPLETED', 'CANCELED'].includes(code.assignment.workOrder.status)) return false;
        if (!(await lockValidAccess(transaction, code, now))) return false;
        const credential = await transaction.propertyAccessCredential.findFirst({
          where: {
            workspaceId: code.workspaceId,
            propertyId: code.assignment.workOrder.propertyId,
            id: credentialId,
            isActive: true,
          },
          select: { id: true },
        });
        if (!credential) return false;
        await transaction.workOrderSensitiveDataAccessEvent.create({
          data: {
            workspaceId: code.workspaceId,
            credentialId,
            assignmentId: code.assignmentId,
            occurredAt: now,
          },
        });
        return true;
      });
    },
  };
}
