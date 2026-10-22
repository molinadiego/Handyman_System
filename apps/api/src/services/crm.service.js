import { AppError } from '../errors/app-error.js';
import {
  parseDateOnly,
  validateAccessCredentialInput,
  validateCustomerInput,
  validatePropertyInput,
  validatePropertyManagerInput,
  validatePropertyRelationshipInput,
} from '../models/crm.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

export function createCrmService({ repository, accessCrypto, now = () => new Date() }) {
  return {
    listCustomers(workspaceId) {
      return repository.listCustomers(workspaceId);
    },

    async createCustomer(workspaceId, input) {
      return repository.createCustomer(workspaceId, validateCustomerInput(input));
    },

    async updateCustomer(workspaceId, customerId, input) {
      const current = await repository.getCustomer(workspaceId, customerId);
      if (!current) throw notFound();
      await repository.updateCustomer(workspaceId, customerId, validateCustomerInput({ ...current, ...input }));
      return repository.getCustomer(workspaceId, customerId);
    },

    listPropertyManagers(workspaceId) {
      return repository.listPropertyManagers(workspaceId);
    },

    async createPropertyManager(workspaceId, input) {
      return repository.createPropertyManager(workspaceId, validatePropertyManagerInput(input));
    },

    async updatePropertyManager(workspaceId, propertyManagerId, input) {
      const current = await repository.getPropertyManager(workspaceId, propertyManagerId);
      if (!current) throw notFound();
      await repository.updatePropertyManager(
        workspaceId,
        propertyManagerId,
        validatePropertyManagerInput({ ...current, ...input }),
      );
      return repository.getPropertyManager(workspaceId, propertyManagerId);
    },

    listProperties(workspaceId) {
      return repository.listProperties(workspaceId);
    },

    async createProperty(workspaceId, input) {
      return repository.createProperty(workspaceId, validatePropertyInput(input));
    },

    async getProperty(workspaceId, propertyId) {
      const property = await repository.getProperty(workspaceId, propertyId);
      if (!property) throw notFound();
      return property;
    },

    async updateProperty(workspaceId, propertyId, input) {
      const current = await repository.getProperty(workspaceId, propertyId);
      if (!current) throw notFound();
      await repository.updateProperty(workspaceId, propertyId, validatePropertyInput({ ...current, ...input }));
      return repository.getProperty(workspaceId, propertyId);
    },

    async listPropertyRelationships(workspaceId, propertyId) {
      if (!(await repository.getProperty(workspaceId, propertyId))) throw notFound();
      return repository.listPropertyRelationships(workspaceId, propertyId);
    },

    async createPropertyRelationship(workspaceId, propertyId, input) {
      if (!(await repository.getProperty(workspaceId, propertyId))) throw notFound();
      const relationship = validatePropertyRelationshipInput(input);

      if (relationship.customerId && !(await repository.getCustomer(workspaceId, relationship.customerId))) {
        throw notFound();
      }
      if (relationship.propertyManagerId
        && !(await repository.getPropertyManager(workspaceId, relationship.propertyManagerId))) {
        throw notFound();
      }

      return repository.createPropertyRelationship(workspaceId, propertyId, relationship);
    },

    async endPropertyRelationship(workspaceId, propertyId, relationshipId, rawEndDate) {
      const relationship = await repository.getPropertyRelationship(workspaceId, propertyId, relationshipId);
      if (!relationship) throw notFound();
      const endDate = parseDateOnly(rawEndDate, 'end date');
      if (endDate < relationship.startDate) {
        throw new AppError('INVALID_RELATIONSHIP_DATES', 'End date cannot be before start date.', 400);
      }

      const updated = await repository.endPropertyRelationship({
        workspaceId,
        propertyId,
        relationshipId,
        endDate,
      });
      if (!updated) throw notFound();
      return updated;
    },

    async listAccessCredentials(workspaceId, propertyId) {
      if (!(await repository.getProperty(workspaceId, propertyId))) throw notFound();
      return repository.listAccessCredentials(workspaceId, propertyId);
    },

    async createAccessCredential(workspaceId, propertyId, actorUserId, input) {
      if (!(await repository.getProperty(workspaceId, propertyId))) throw notFound();
      const { type, label, value } = validateAccessCredentialInput(input);
      const encryptedData = accessCrypto.encrypt(value);
      return repository.createAccessCredential(workspaceId, propertyId, actorUserId, {
        type,
        label,
        ciphertext: encryptedData.ciphertext,
        nonce: encryptedData.nonce,
        authTag: encryptedData.authTag,
        keyVersion: encryptedData.keyVersion,
      });
    },

    async revealAccessCredential(workspaceId, propertyId, credentialId, actorUserId) {
      const credential = await repository.getAccessCredentialForReveal(workspaceId, propertyId, credentialId);
      if (!credential) throw notFound();

      const value = accessCrypto.decrypt(credential);
      await repository.recordSensitiveDataAccess({
        workspaceId,
        credentialId,
        actorUserId,
        occurredAt: now(),
      });
      return { id: credential.id, type: credential.type, label: credential.label, value };
    },

    async deactivateAccessCredential(workspaceId, propertyId, credentialId, actorUserId) {
      const updated = await repository.deactivateAccessCredential({
        workspaceId,
        propertyId,
        credentialId,
        actorUserId,
        occurredAt: now(),
      });
      if (!updated) throw notFound();
      return { id: credentialId, isActive: false };
    },
  };
}
