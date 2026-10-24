import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';
import { validateWorkOrderMediaUpload } from '../models/work-order-media.model.js';
import { tokenDigest } from './token-digest.js';
import { validateWorkOrderAccessCode } from '../models/employee.model.js';

function notFound() {
  return new AppError('RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404);
}

function extensionFor(contentType) {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'video/mp4') return 'mp4';
  return 'mov';
}

function uploadPermissionError(type) {
  return new AppError(type === 'PHOTO' ? 'WORK_ORDER_PHOTO_UPLOAD_FORBIDDEN' : 'WORK_ORDER_VIDEO_UPLOAD_FORBIDDEN', 'This employee is not allowed to upload this media type.', 403);
}

export function createWorkOrderMediaService({ mediaRepository, workOrderRepository, assignmentRepository, mediaStore, now = () => new Date() }) {
  async function storeFile({ workspaceId, workOrderId, body, contentType, filename, metadata: suppliedMetadata, accessCodeHash = null, uploadedByUserId = null, uploadedByAssignmentId = null }) {
    if (!mediaStore.isConfigured()) {
      throw new AppError('MEDIA_STORAGE_NOT_CONFIGURED', 'Work order file storage is not configured.', 503);
    }
    const metadata = suppliedMetadata ?? validateWorkOrderMediaUpload({ body, contentType, filename });
    const objectKey = `${workspaceId}/${workOrderId}/${randomUUID()}.${extensionFor(metadata.contentType)}`;
    await mediaStore.upload({ key: objectKey, body, contentType: metadata.contentType });
    const attachment = await mediaRepository.createAttachment({
      workspaceId,
      workOrderId,
      accessCodeHash,
      now: now(),
      data: {
        ...metadata,
        objectKey,
        uploadedByUserId,
        uploadedByAssignmentId,
      },
    });
    if (!attachment) {
      try { await mediaStore.delete(objectKey); } catch { /* An unreferenced private object is not exposed. */ }
      throw notFound();
    }
    return attachment;
  }

  return {
    async listForOwner(workspaceId, workOrderId) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return mediaRepository.listAttachments(workspaceId, workOrderId);
    },

    async uploadForOwner({ workspaceId, workOrderId, actorUserId, body, contentType, filename }) {
      if (!(await workOrderRepository.getWorkOrder(workspaceId, workOrderId))) throw notFound();
      return storeFile({ workspaceId, workOrderId, body, contentType, filename, uploadedByUserId: actorUserId });
    },

    async downloadForOwner({ workspaceId, workOrderId, attachmentId }) {
      const attachment = await mediaRepository.getAttachment(workspaceId, workOrderId, attachmentId);
      if (!attachment) throw notFound();
      return { attachment, body: await mediaStore.download(attachment.objectKey) };
    },

    async listForAssignedEmployee(rawCode) {
      const tokenHash = tokenDigest(validateWorkOrderAccessCode(rawCode));
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      const attachments = await mediaRepository.listAttachments(context.workspaceId, context.workOrder.id);
      return attachments.filter((attachment) => (attachment.type === 'PHOTO' && context.employee.canUploadPhotos)
        || (attachment.type === 'VIDEO' && context.employee.canUploadVideos));
    },

    async uploadForAssignedEmployee({ rawCode, body, contentType, filename }) {
      const tokenHash = tokenDigest(validateWorkOrderAccessCode(rawCode));
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      const metadata = validateWorkOrderMediaUpload({ body, contentType, filename });
      const allowed = metadata.type === 'PHOTO' ? context.employee.canUploadPhotos : context.employee.canUploadVideos;
      if (!allowed) throw uploadPermissionError(metadata.type);
      return storeFile({
        workspaceId: context.workspaceId,
        workOrderId: context.workOrder.id,
        body,
        contentType,
        filename,
        metadata,
        accessCodeHash: tokenHash,
        uploadedByAssignmentId: context.assignmentId,
      });
    },

    async downloadForAssignedEmployee({ rawCode, attachmentId }) {
      const tokenHash = tokenDigest(validateWorkOrderAccessCode(rawCode));
      const context = await assignmentRepository.findActiveAccessByTokenHash(tokenHash, now());
      if (!context) throw new AppError('WORK_ORDER_ACCESS_INVALID', 'This work order access code is invalid or no longer active.', 401);
      const attachment = await mediaRepository.getAttachmentForAssignment({
        workspaceId: context.workspaceId,
        workOrderId: context.workOrder.id,
        attachmentId,
        accessCodeHash: tokenHash,
        now: now(),
      });
      if (!attachment) throw notFound();
      const allowed = attachment.type === 'PHOTO' ? context.employee.canUploadPhotos : context.employee.canUploadVideos;
      if (!allowed) throw uploadPermissionError(attachment.type);
      return { attachment, body: await mediaStore.download(attachment.objectKey) };
    },
  };
}
