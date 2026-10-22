import { Router } from 'express';

export function createCrmRouter({
  controller,
  ownerSessionMiddleware,
  ownedWorkspaceMiddleware,
  sameOriginMiddleware,
}) {
  const router = Router();
  const readScope = [ownerSessionMiddleware, ownedWorkspaceMiddleware];
  const writeScope = [sameOriginMiddleware, ownerSessionMiddleware, ownedWorkspaceMiddleware];

  router.get('/:workspaceId/customers', ...readScope, controller.listCustomers);
  router.post('/:workspaceId/customers', ...writeScope, controller.createCustomer);
  router.patch('/:workspaceId/customers/:customerId', ...writeScope, controller.updateCustomer);
  router.get('/:workspaceId/property-managers', ...readScope, controller.listPropertyManagers);
  router.post('/:workspaceId/property-managers', ...writeScope, controller.createPropertyManager);
  router.patch('/:workspaceId/property-managers/:propertyManagerId', ...writeScope, controller.updatePropertyManager);
  router.get('/:workspaceId/properties', ...readScope, controller.listProperties);
  router.post('/:workspaceId/properties', ...writeScope, controller.createProperty);
  router.patch('/:workspaceId/properties/:propertyId', ...writeScope, controller.updateProperty);
  router.get('/:workspaceId/properties/:propertyId', ...readScope, controller.getProperty);
  router.get('/:workspaceId/properties/:propertyId/relationships', ...readScope, controller.listPropertyRelationships);
  router.post('/:workspaceId/properties/:propertyId/relationships', ...writeScope, controller.createPropertyRelationship);
  router.post(
    '/:workspaceId/properties/:propertyId/relationships/:relationshipId/end',
    ...writeScope,
    controller.endPropertyRelationship,
  );
  router.get('/:workspaceId/properties/:propertyId/access-credentials', ...readScope, controller.listAccessCredentials);
  router.post('/:workspaceId/properties/:propertyId/access-credentials', ...writeScope, controller.createAccessCredential);
  router.post(
    '/:workspaceId/properties/:propertyId/access-credentials/:credentialId/reveal',
    ...writeScope,
    controller.revealAccessCredential,
  );
  router.post(
    '/:workspaceId/properties/:propertyId/access-credentials/:credentialId/deactivate',
    ...writeScope,
    controller.deactivateAccessCredential,
  );

  return router;
}
