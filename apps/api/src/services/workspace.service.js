import { validateWorkspaceInput } from '../models/workspace.model.js';

export function createWorkspaceService({ workspaceRepository }) {
  return {
    createForOwner({ ownerUserId, name, timeZone }) {
      const validInput = validateWorkspaceInput({ name, timeZone });
      return workspaceRepository.createOwnedWorkspace({ ownerUserId, ...validInput });
    },

    listForOwner(ownerUserId) {
      return workspaceRepository.listOwnedWorkspaces(ownerUserId);
    },

    getForOwner({ workspaceId, ownerUserId }) {
      return workspaceRepository.findOwnedWorkspace({ workspaceId, ownerUserId });
    },
  };
}
