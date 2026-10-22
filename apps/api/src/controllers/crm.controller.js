export function createCrmController({ crmService }) {
  return {
    listCustomers: async (request, response) => {
      const data = await crmService.listCustomers(request.workspace.id);
      response.status(200).json({ data });
    },
    createCustomer: async (request, response) => {
      const data = await crmService.createCustomer(request.workspace.id, request.body ?? {});
      response.status(201).json({ data });
    },
    updateCustomer: async (request, response) => {
      const data = await crmService.updateCustomer(request.workspace.id, request.params.customerId, request.body ?? {});
      response.status(200).json({ data });
    },
    listPropertyManagers: async (request, response) => {
      const data = await crmService.listPropertyManagers(request.workspace.id);
      response.status(200).json({ data });
    },
    createPropertyManager: async (request, response) => {
      const data = await crmService.createPropertyManager(request.workspace.id, request.body ?? {});
      response.status(201).json({ data });
    },
    updatePropertyManager: async (request, response) => {
      const data = await crmService.updatePropertyManager(
        request.workspace.id,
        request.params.propertyManagerId,
        request.body ?? {},
      );
      response.status(200).json({ data });
    },
    listProperties: async (request, response) => {
      const data = await crmService.listProperties(request.workspace.id);
      response.status(200).json({ data });
    },
    getProperty: async (request, response) => {
      const data = await crmService.getProperty(request.workspace.id, request.params.propertyId);
      response.status(200).json({ data });
    },
    createProperty: async (request, response) => {
      const data = await crmService.createProperty(request.workspace.id, request.body ?? {});
      response.status(201).json({ data });
    },
    updateProperty: async (request, response) => {
      const data = await crmService.updateProperty(request.workspace.id, request.params.propertyId, request.body ?? {});
      response.status(200).json({ data });
    },
    listPropertyRelationships: async (request, response) => {
      const data = await crmService.listPropertyRelationships(request.workspace.id, request.params.propertyId);
      response.status(200).json({ data });
    },
    createPropertyRelationship: async (request, response) => {
      const data = await crmService.createPropertyRelationship(
        request.workspace.id,
        request.params.propertyId,
        request.body ?? {},
      );
      response.status(201).json({ data });
    },
    endPropertyRelationship: async (request, response) => {
      const data = await crmService.endPropertyRelationship(
        request.workspace.id,
        request.params.propertyId,
        request.params.relationshipId,
        request.body?.endDate,
      );
      response.status(200).json({ data });
    },
    listAccessCredentials: async (request, response) => {
      const data = await crmService.listAccessCredentials(request.workspace.id, request.params.propertyId);
      response.status(200).json({ data });
    },
    createAccessCredential: async (request, response) => {
      const data = await crmService.createAccessCredential(
        request.workspace.id,
        request.params.propertyId,
        request.auth.userId,
        request.body ?? {},
      );
      response.status(201).json({ data });
    },
    revealAccessCredential: async (request, response) => {
      const data = await crmService.revealAccessCredential(
        request.workspace.id,
        request.params.propertyId,
        request.params.credentialId,
        request.auth.userId,
      );
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ data });
    },
    deactivateAccessCredential: async (request, response) => {
      const data = await crmService.deactivateAccessCredential(
        request.workspace.id,
        request.params.propertyId,
        request.params.credentialId,
        request.auth.userId,
      );
      response.status(200).json({ data });
    },
  };
}
