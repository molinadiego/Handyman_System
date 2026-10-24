const employeeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  calendarColor: true,
  canUpdateProgress: true,
  canAddNotes: true,
  canUploadPhotos: true,
  canUploadVideos: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export function createPrismaEmployeeRepository(prisma) {
  return {
    listEmployees(workspaceId) {
      return prisma.employee.findMany({
        where: { workspaceId },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: employeeSelect,
      });
    },

    getEmployee(workspaceId, employeeId) {
      return prisma.employee.findFirst({ where: { workspaceId, id: employeeId }, select: employeeSelect });
    },

    createEmployee(workspaceId, data) {
      return prisma.employee.create({ data: { workspaceId, ...data }, select: employeeSelect });
    },

    async updateEmployee(workspaceId, employeeId, data, occurredAt) {
      return prisma.$transaction(async (transaction) => {
        const current = await transaction.employee.findFirst({
          where: { workspaceId, id: employeeId },
          select: { email: true, isActive: true },
        });
        if (!current) return null;
        const updated = await transaction.employee.updateMany({ where: { workspaceId, id: employeeId }, data });
        if (!updated.count) return null;
        const deactivateAccess = data.isActive === false || (data.email !== undefined && data.email !== current.email);
        if (deactivateAccess) {
          const assignments = await transaction.workOrderAssignment.findMany({
            where: { workspaceId, employeeId, revokedAt: null },
            select: { id: true },
          });
          if (assignments.length) {
            if (data.isActive === false) {
              await transaction.workOrderAssignment.updateMany({
                where: { workspaceId, employeeId, revokedAt: null },
                data: { revokedAt: occurredAt, activeKey: null },
              });
            }
            await transaction.workOrderAccessCode.updateMany({
              where: { workspaceId, assignmentId: { in: assignments.map(({ id }) => id) }, revokedAt: null },
              data: { revokedAt: occurredAt },
            });
          }
        }
        return transaction.employee.findFirst({ where: { workspaceId, id: employeeId }, select: employeeSelect });
      });
    },
  };
}
