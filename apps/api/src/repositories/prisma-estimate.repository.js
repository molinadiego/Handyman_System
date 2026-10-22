const requestSelect = {
  id: true,
  requesterName: true,
  requesterEmail: true,
  requesterPhone: true,
  customerId: true,
  propertyManagerId: true,
  propertyId: true,
  description: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const estimateInclude = {
  customer: { select: { id: true, name: true, companyName: true, email: true } },
  propertyManager: { select: { id: true, name: true, companyName: true, email: true } },
  property: {
    select: { id: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, country: true },
  },
  serviceRequest: { select: { id: true, requesterName: true, description: true, status: true } },
  versions: {
    orderBy: { versionNumber: 'desc' },
    include: { lines: { orderBy: { position: 'asc' } } },
  },
  events: { orderBy: { occurredAt: 'desc' } },
  communications: { orderBy: { createdAt: 'desc' } },
};

function versionData({ workspaceId, estimateId, versionNumber, actorUserId, data, snapshot, money }) {
  return {
    workspaceId,
    estimateId,
    versionNumber,
    businessNameSnapshot: snapshot.businessName,
    recipientNameSnapshot: snapshot.recipientName,
    recipientEmailSnapshot: snapshot.recipientEmail,
    propertyAddressSnapshot: snapshot.propertyAddress,
    scopeSnapshot: data.scopeSnapshot,
    subtotal: money.subtotal,
    discountType: data.discountType,
    discountValue: money.discountValue,
    discountAmount: money.discountAmount,
    taxable: money.taxable,
    taxRateOverride: data.taxRateOverride,
    taxRate: money.taxRate,
    taxBase: money.taxBase,
    taxAmount: money.taxAmount,
    total: money.total,
    createdByUserId: actorUserId,
  };
}

export function createPrismaEstimateRepository(prisma) {
  return {
    getWorkspaceEstimateSettings(workspaceId) {
      return prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, defaultTaxRate: true },
      });
    },

    getServiceRequest(workspaceId, requestId) {
      return prisma.serviceRequest.findFirst({
        where: { workspaceId, id: requestId },
        select: requestSelect,
      });
    },

    listServiceRequests(workspaceId) {
      return prisma.serviceRequest.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        select: requestSelect,
      });
    },

    async createServiceRequest({ workspaceId, createdByUserId, data }) {
      return prisma.$transaction(async (transaction) => {
        const request = await transaction.serviceRequest.create({
          data: { workspaceId, createdByUserId, ...data },
          select: requestSelect,
        });
        await transaction.serviceRequestEvent.create({
          data: {
            workspaceId,
            requestId: request.id,
            fromStatus: null,
            toStatus: 'RECEIVED',
            actorUserId: createdByUserId,
          },
        });
        return request;
      });
    },

    async updateServiceRequestStatus({ workspaceId, requestId, actorUserId, status }) {
      return prisma.$transaction(async (transaction) => {
        const request = await transaction.serviceRequest.findFirst({ where: { workspaceId, id: requestId } });
        if (!request) return null;
        if (request.status === 'CLOSED' || request.status === 'NOT_ACCEPTED') return null;
        await transaction.serviceRequest.update({ where: { id: request.id }, data: { status } });
        await transaction.serviceRequestEvent.create({
          data: {
            workspaceId,
            requestId,
            fromStatus: request.status,
            toStatus: status,
            actorUserId,
          },
        });
        return transaction.serviceRequest.findFirst({ where: { workspaceId, id: requestId }, select: requestSelect });
      });
    },

    async listEstimates(workspaceId, now) {
      const sentEstimates = await prisma.estimate.findMany({
        where: { workspaceId, status: 'SENT', latestSentVersionNumber: { not: null } },
        select: {
          id: true,
          latestSentVersionNumber: true,
          versions: { select: { id: true, versionNumber: true, expiresAt: true } },
        },
      });
      const expired = sentEstimates.flatMap((estimate) => {
        const version = estimate.versions.find((item) => item.versionNumber === estimate.latestSentVersionNumber);
        return version?.expiresAt && version.expiresAt <= now ? [{ estimateId: estimate.id, versionId: version.id }] : [];
      });
      if (expired.length) {
        await prisma.$transaction(async (transaction) => {
          for (const item of expired) {
            const updated = await transaction.estimate.updateMany({
              where: { workspaceId, id: item.estimateId, status: 'SENT' },
              data: { status: 'EXPIRED' },
            });
            if (updated.count) {
              await transaction.estimateAcceptanceToken.updateMany({
                where: { workspaceId, estimateId: item.estimateId, consumedAt: null },
                data: { consumedAt: now },
              });
              await transaction.estimateEvent.create({
                data: {
                  workspaceId,
                  estimateId: item.estimateId,
                  estimateVersionId: item.versionId,
                  type: 'EXPIRED',
                  occurredAt: now,
                },
              });
            }
          }
        });
      }
      return prisma.estimate.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, include: estimateInclude });
    },

    getEstimate(workspaceId, estimateId) {
      return prisma.estimate.findFirst({ where: { workspaceId, id: estimateId }, include: estimateInclude });
    },

    async createEstimateDraft({ workspaceId, createdByUserId, data, snapshot, money }) {
      return prisma.$transaction(async (transaction) => {
        const workspace = await transaction.workspace.update({
          where: { id: workspaceId },
          data: { nextEstimateNumber: { increment: 1 } },
          select: { nextEstimateNumber: true },
        });
        const estimate = await transaction.estimate.create({
          data: {
            workspaceId,
            number: workspace.nextEstimateNumber - 1,
            createdByUserId,
            status: 'DRAFT',
            currentVersionNumber: 1,
            customerId: data.customerId,
            propertyManagerId: data.propertyManagerId,
            propertyId: data.propertyId,
            serviceRequestId: data.serviceRequestId,
          },
        });
        const version = await transaction.estimateVersion.create({
          data: versionData({ workspaceId, estimateId: estimate.id, versionNumber: 1, actorUserId: createdByUserId, data, snapshot, money }),
        });
        if (money.lines.length) {
          await transaction.estimateLine.createMany({
            data: money.lines.map((line, index) => ({
              workspaceId,
              estimateVersionId: version.id,
              position: index + 1,
              ...line,
            })),
          });
        }
        await transaction.estimateEvent.create({
          data: { workspaceId, estimateId: estimate.id, estimateVersionId: version.id, type: 'CREATED', actorUserId: createdByUserId },
        });
        return transaction.estimate.findFirst({ where: { workspaceId, id: estimate.id }, include: estimateInclude });
      });
    },

    async saveEstimateVersion({ workspaceId, estimateId, actorUserId, data, snapshot, money }) {
      return prisma.$transaction(async (transaction) => {
        const estimate = await transaction.estimate.findFirst({ where: { workspaceId, id: estimateId } });
        if (!estimate) return null;
        if (estimate.status === 'ACCEPTED' || estimate.status === 'REJECTED') return { locked: true };

        const versionNumber = estimate.currentVersionNumber + 1;
        await transaction.estimate.update({
          where: { id: estimate.id },
          data: {
            customerId: data.customerId,
            propertyManagerId: data.propertyManagerId,
            propertyId: data.propertyId,
            serviceRequestId: data.serviceRequestId,
            currentVersionNumber: versionNumber,
            status: 'DRAFT',
          },
        });
        await transaction.estimateAcceptanceToken.updateMany({
          where: { workspaceId, estimateId, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        const version = await transaction.estimateVersion.create({
          data: versionData({ workspaceId, estimateId, versionNumber, actorUserId, data, snapshot, money }),
        });
        await transaction.estimateLine.createMany({
          data: money.lines.map((line, index) => ({
            workspaceId,
            estimateVersionId: version.id,
            position: index + 1,
            ...line,
          })),
        });
        await transaction.estimateEvent.create({
          data: { workspaceId, estimateId, estimateVersionId: version.id, type: 'VERSION_CREATED', actorUserId },
        });
        return transaction.estimate.findFirst({ where: { workspaceId, id: estimateId }, include: estimateInclude });
      });
    },

    async prepareEstimateSend({ workspaceId, estimateId, actorUserId, versionId, versionNumber, tokenHash, expiresAt, money, now }) {
      return prisma.$transaction(async (transaction) => {
        const estimate = await transaction.estimate.findFirst({ where: { workspaceId, id: estimateId } });
        if (!estimate || estimate.status === 'ACCEPTED' || estimate.status === 'REJECTED'
          || estimate.currentVersionNumber !== versionNumber) return null;
        const currentVersion = await transaction.estimateVersion.findFirst({
          where: { workspaceId, estimateId, id: versionId, versionNumber },
        });
        if (!currentVersion) return null;
        await transaction.estimateAcceptanceToken.updateMany({
          where: { workspaceId, estimateId, consumedAt: null },
          data: { consumedAt: now },
        });
        const version = await transaction.estimateVersion.update({
          where: { id: versionId },
          data: {
            subtotal: money.subtotal,
            discountValue: money.discountValue,
            discountAmount: money.discountAmount,
            taxable: money.taxable,
            taxRate: money.taxRate,
            taxBase: money.taxBase,
            taxAmount: money.taxAmount,
            total: money.total,
            sentAt: now,
            expiresAt,
          },
          include: { lines: { orderBy: { position: 'asc' } } },
        });
        await transaction.estimateAcceptanceToken.create({
          data: { workspaceId, estimateId, estimateVersionId: versionId, tokenHash, expiresAt },
        });
        await transaction.estimate.update({
          where: { id: estimateId },
          data: { status: 'SENT', latestSentVersionNumber: versionNumber },
        });
        await transaction.estimateEvent.create({
          data: { workspaceId, estimateId, estimateVersionId: versionId, type: 'SENT', actorUserId },
        });
        return { estimate, version };
      });
    },

    createEstimateCommunication({ workspaceId, estimateId, estimateVersionId, recipient, status, failureCode }) {
      return prisma.estimateCommunication.create({
        data: { workspaceId, estimateId, estimateVersionId, channel: 'EMAIL', recipients: [recipient], status, failureCode: failureCode ?? null },
        select: { id: true, status: true, createdAt: true },
      });
    },

    async acceptEstimateToken({ tokenHash, now }) {
      return prisma.$transaction(async (transaction) => {
        const token = await transaction.estimateAcceptanceToken.findUnique({
          where: { tokenHash },
          include: { estimate: true, version: true },
        });
        if (!token || token.consumedAt
          || token.estimate.latestSentVersionNumber !== token.version.versionNumber
          || token.estimate.status === 'ACCEPTED' || token.estimate.status === 'REJECTED') return null;
        if (token.expiresAt <= now) {
          await transaction.estimateAcceptanceToken.updateMany({
            where: { workspaceId: token.workspaceId, estimateId: token.estimateId, consumedAt: null },
            data: { consumedAt: now },
          });
          if (token.estimate.status === 'SENT') {
            await transaction.estimate.update({ where: { id: token.estimateId }, data: { status: 'EXPIRED' } });
            await transaction.estimateEvent.create({
              data: {
                workspaceId: token.workspaceId,
                estimateId: token.estimateId,
                estimateVersionId: token.estimateVersionId,
                type: 'EXPIRED',
                occurredAt: now,
              },
            });
          }
          return null;
        }

        const consumed = await transaction.estimateAcceptanceToken.updateMany({
          where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
          data: { consumedAt: now },
        });
        if (consumed.count !== 1) return null;
        await transaction.estimateAcceptanceToken.updateMany({
          where: { workspaceId: token.workspaceId, estimateId: token.estimateId, consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.estimate.update({ where: { id: token.estimateId }, data: { status: 'ACCEPTED' } });
        await transaction.estimateVersion.update({ where: { id: token.estimateVersionId }, data: { acceptedAt: now } });
        await transaction.estimateEvent.create({
          data: {
            workspaceId: token.workspaceId,
            estimateId: token.estimateId,
            estimateVersionId: token.estimateVersionId,
            type: 'ACCEPTED',
            occurredAt: now,
          },
        });
        return {
          estimateNumber: token.estimate.number,
          versionNumber: token.version.versionNumber,
          recipientName: token.version.recipientNameSnapshot,
          total: token.version.total?.toString() ?? null,
        };
      });
    },

    async rejectEstimate({ workspaceId, estimateId, actorUserId, reason, now }) {
      return prisma.$transaction(async (transaction) => {
        const estimate = await transaction.estimate.findFirst({ where: { workspaceId, id: estimateId } });
        if (!estimate || estimate.status === 'ACCEPTED' || estimate.status === 'REJECTED') return null;
        await transaction.estimateAcceptanceToken.updateMany({
          where: { workspaceId, estimateId, consumedAt: null },
          data: { consumedAt: now },
        });
        await transaction.estimate.update({ where: { id: estimateId }, data: { status: 'REJECTED' } });
        await transaction.estimateEvent.create({
          data: {
            workspaceId,
            estimateId,
            estimateVersionId: null,
            type: 'REJECTED',
            actorUserId,
            occurredAt: now,
            metadata: reason ? { reason } : undefined,
          },
        });
        return transaction.estimate.findFirst({ where: { workspaceId, id: estimateId }, include: estimateInclude });
      });
    },
  };
}
