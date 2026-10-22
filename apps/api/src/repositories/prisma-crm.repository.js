const safeCustomerSelect = {
  id: true,
  type: true,
  name: true,
  companyName: true,
  email: true,
  phone: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const safeManagerSelect = {
  id: true,
  name: true,
  companyName: true,
  email: true,
  phone: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

const safePropertySelect = {
  id: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  country: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

export function createPrismaCrmRepository(prisma) {
  return {
    listCustomers(workspaceId) {
      return prisma.customer.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
        select: safeCustomerSelect,
      });
    },

    createCustomer(workspaceId, data) {
      return prisma.customer.create({
        data: { workspaceId, ...data },
        select: safeCustomerSelect,
      });
    },

    updateCustomer(workspaceId, customerId, data) {
      return prisma.customer.updateMany({ where: { workspaceId, id: customerId }, data });
    },

    getCustomer(workspaceId, customerId) {
      return prisma.customer.findFirst({
        where: { workspaceId, id: customerId },
        select: safeCustomerSelect,
      });
    },

    listPropertyManagers(workspaceId) {
      return prisma.propertyManager.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
        select: safeManagerSelect,
      });
    },

    createPropertyManager(workspaceId, data) {
      return prisma.propertyManager.create({
        data: { workspaceId, ...data },
        select: safeManagerSelect,
      });
    },

    updatePropertyManager(workspaceId, propertyManagerId, data) {
      return prisma.propertyManager.updateMany({ where: { workspaceId, id: propertyManagerId }, data });
    },

    getPropertyManager(workspaceId, propertyManagerId) {
      return prisma.propertyManager.findFirst({
        where: { workspaceId, id: propertyManagerId },
        select: safeManagerSelect,
      });
    },

    listProperties(workspaceId) {
      return prisma.property.findMany({
        where: { workspaceId },
        orderBy: [{ city: 'asc' }, { addressLine1: 'asc' }],
        select: safePropertySelect,
      });
    },

    createProperty(workspaceId, data) {
      return prisma.property.create({
        data: { workspaceId, ...data },
        select: safePropertySelect,
      });
    },

    updateProperty(workspaceId, propertyId, data) {
      return prisma.property.updateMany({ where: { workspaceId, id: propertyId }, data });
    },

    async getProperty(workspaceId, propertyId) {
      return prisma.property.findFirst({
        where: { workspaceId, id: propertyId },
        select: safePropertySelect,
      });
    },

    listPropertyRelationships(workspaceId, propertyId) {
      return prisma.propertyRelationship.findMany({
        where: { workspaceId, propertyId },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: { select: { id: true, type: true, name: true, companyName: true } },
          propertyManager: { select: { id: true, name: true, companyName: true } },
        },
      });
    },

    getPropertyRelationship(workspaceId, propertyId, relationshipId) {
      return prisma.propertyRelationship.findFirst({
        where: { workspaceId, propertyId, id: relationshipId },
        select: { id: true, startDate: true, endDate: true },
      });
    },

    createPropertyRelationship(workspaceId, propertyId, data) {
      return prisma.propertyRelationship.create({
        data: { workspaceId, propertyId, ...data },
        include: {
          customer: { select: { id: true, type: true, name: true, companyName: true } },
          propertyManager: { select: { id: true, name: true, companyName: true } },
        },
      });
    },

    async endPropertyRelationship({ workspaceId, propertyId, relationshipId, endDate }) {
      const updated = await prisma.propertyRelationship.updateMany({
        where: { workspaceId, propertyId, id: relationshipId, endDate: null },
        data: { endDate },
      });
      if (!updated.count) return null;
      return prisma.propertyRelationship.findFirst({
        where: { workspaceId, propertyId, id: relationshipId },
        include: {
          customer: { select: { id: true, type: true, name: true, companyName: true } },
          propertyManager: { select: { id: true, name: true, companyName: true } },
        },
      });
    },

    createAccessCredential(workspaceId, propertyId, actorUserId, encryptedData) {
      return prisma.propertyAccessCredential.create({
        data: { workspaceId, propertyId, createdByUserId: actorUserId, ...encryptedData },
        select: { id: true, type: true, label: true, isActive: true, createdAt: true },
      });
    },

    listAccessCredentials(workspaceId, propertyId) {
      return prisma.propertyAccessCredential.findMany({
        where: { workspaceId, propertyId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, label: true, isActive: true, createdAt: true },
      });
    },

    getAccessCredentialForReveal(workspaceId, propertyId, credentialId) {
      return prisma.propertyAccessCredential.findFirst({
        where: { workspaceId, propertyId, id: credentialId, isActive: true },
        select: {
          id: true,
          type: true,
          label: true,
          ciphertext: true,
          nonce: true,
          authTag: true,
          keyVersion: true,
        },
      });
    },

    async deactivateAccessCredential({ workspaceId, propertyId, credentialId, actorUserId, occurredAt }) {
      return prisma.$transaction(async (transaction) => {
        const updated = await transaction.propertyAccessCredential.updateMany({
          where: { workspaceId, propertyId, id: credentialId, isActive: true },
          data: { isActive: false },
        });
        if (!updated.count) return null;
        await transaction.sensitiveDataAccessEvent.create({
          data: { workspaceId, credentialId, actorUserId, occurredAt, action: 'DEACTIVATE' },
        });
        return { id: credentialId, isActive: false };
      });
    },

    recordSensitiveDataAccess({ workspaceId, credentialId, actorUserId, occurredAt, action = 'VIEW' }) {
      return prisma.sensitiveDataAccessEvent.create({
        data: { workspaceId, credentialId, actorUserId, occurredAt, action },
        select: { id: true, occurredAt: true },
      });
    },
  };
}
