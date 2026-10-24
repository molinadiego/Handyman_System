const attachmentSelect = {
  id: true,
  workOrderId: true,
  type: true,
  originalName: true,
  contentType: true,
  sizeBytes: true,
  durationSeconds: true,
  uploadedByUserId: true,
  uploadedByAssignmentId: true,
  createdAt: true,
};

export function createPrismaWorkOrderMediaRepository(prisma) {
  return {
    listAttachments(workspaceId, workOrderId) {
      return prisma.workOrderAttachment.findMany({
        where: { workspaceId, workOrderId },
        orderBy: { createdAt: 'asc' },
        select: attachmentSelect,
      });
    },

    async createAttachment({ workspaceId, workOrderId, data, accessCodeHash = null, now = new Date() }) {
      return prisma.$transaction(async (transaction) => {
        const workOrder = await transaction.workOrder.findFirst({
          where: { workspaceId, id: workOrderId },
          select: { id: true },
        });
        if (!workOrder) return null;
        if (data.uploadedByAssignmentId) {
          const code = await transaction.workOrderAccessCode.findFirst({
            where: {
              tokenHash: accessCodeHash,
              workspaceId,
              revokedAt: null,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              assignment: {
                is: {
                  id: data.uploadedByAssignmentId,
                  workOrderId,
                  revokedAt: null,
                  employee: { is: { isActive: true } },
                  workOrder: { is: { status: { notIn: ['COMPLETED', 'CANCELED'] } } },
                },
              },
            },
            include: { assignment: { include: { employee: { select: { canUploadPhotos: true, canUploadVideos: true } } } } },
          });
          if (!code?.assignment.employee) return null;
          const allowed = data.type === 'PHOTO'
            ? code.assignment.employee.canUploadPhotos
            : code.assignment.employee.canUploadVideos;
          if (!allowed) return null;
        }
        return transaction.workOrderAttachment.create({
          data: { workspaceId, workOrderId, ...data },
          select: attachmentSelect,
        });
      });
    },

    getAttachment(workspaceId, workOrderId, attachmentId) {
      return prisma.workOrderAttachment.findFirst({
        where: { workspaceId, workOrderId, id: attachmentId },
        select: { ...attachmentSelect, objectKey: true },
      });
    },

    async getAttachmentForAssignment({ workspaceId, workOrderId, attachmentId, accessCodeHash, now }) {
      return prisma.$transaction(async (transaction) => {
        const code = await transaction.workOrderAccessCode.findFirst({
          where: {
            tokenHash: accessCodeHash,
            workspaceId,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            assignment: {
              is: {
                workOrderId,
                revokedAt: null,
                employee: { is: { isActive: true } },
                workOrder: { is: { status: { notIn: ['COMPLETED', 'CANCELED'] } } },
              },
            },
          },
          include: { assignment: { include: { employee: { select: { canUploadPhotos: true, canUploadVideos: true } } } } },
        });
        if (!code?.assignment.employee) return null;
        const attachment = await transaction.workOrderAttachment.findFirst({
          where: { workspaceId, workOrderId, id: attachmentId },
          select: { ...attachmentSelect, objectKey: true },
        });
        if (!attachment) return null;
        const allowed = attachment.type === 'PHOTO'
          ? code.assignment.employee.canUploadPhotos
          : code.assignment.employee.canUploadVideos;
        return allowed ? attachment : null;
      });
    },
  };
}
