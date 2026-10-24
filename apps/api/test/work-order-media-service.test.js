import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkOrderMediaService } from '../src/services/work-order-media.service.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x01]);

test('employee photo upload requires the assigned order permission and stores a private generated key', async () => {
  let storedObject;
  let createdAttachment;
  const service = createWorkOrderMediaService({
    mediaRepository: {
      async createAttachment(input) {
        createdAttachment = input;
        return { id: 'attachment-1', type: input.data.type, originalName: input.data.originalName };
      },
    },
    workOrderRepository: {},
    assignmentRepository: {
      async findActiveAccessByTokenHash() {
        return {
          workspaceId: 'workspace-id',
          assignmentId: 'assignment-id',
          employee: { canUploadPhotos: true, canUploadVideos: false },
          workOrder: { id: 'order-id' },
        };
      },
    },
    mediaStore: {
      isConfigured: () => true,
      async upload(input) { storedObject = input; },
    },
  });

  const result = await service.uploadForAssignedEmployee({
    rawCode: 'a'.repeat(43),
    body: jpeg,
    contentType: 'image/jpeg',
    filename: '../../private/photo.jpg',
  });

  assert.equal(result.id, 'attachment-1');
  assert.equal(storedObject.contentType, 'image/jpeg');
  assert.match(storedObject.key, /^workspace-id\/order-id\/[\da-f-]+\.jpg$/u);
  assert.equal(createdAttachment.data.uploadedByAssignmentId, 'assignment-id');
  assert.equal(JSON.stringify(createdAttachment).includes('a'.repeat(43)), false);
});

test('employee media upload fails closed when the owner has not granted that media permission', async () => {
  const service = createWorkOrderMediaService({
    mediaRepository: {},
    workOrderRepository: {},
    assignmentRepository: {
      async findActiveAccessByTokenHash() {
        return {
          workspaceId: 'workspace-id',
          assignmentId: 'assignment-id',
          employee: { canUploadPhotos: false, canUploadVideos: false },
          workOrder: { id: 'order-id' },
        };
      },
    },
    mediaStore: { isConfigured: () => true },
  });

  await assert.rejects(
    () => service.uploadForAssignedEmployee({ rawCode: 'b'.repeat(43), body: jpeg, contentType: 'image/jpeg', filename: 'photo.jpg' }),
    { code: 'WORK_ORDER_PHOTO_UPLOAD_FORBIDDEN' },
  );
});
