-- CreateEnum
CREATE TYPE "WorkOrderAttachmentType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "WorkOrderAttachment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "type" "WorkOrderAttachmentType" NOT NULL,
    "objectKey" VARCHAR(512) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(80) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "uploadedByUserId" UUID,
    "uploadedByAssignmentId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAttachment_objectKey_key" ON "WorkOrderAttachment"("objectKey");

-- CreateIndex
CREATE INDEX "WorkOrderAttachment_workspaceId_workOrderId_createdAt_idx" ON "WorkOrderAttachment"("workspaceId", "workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrderAttachment_workspaceId_uploadedByAssignmentId_idx" ON "WorkOrderAttachment"("workspaceId", "uploadedByAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAttachment_workspaceId_id_key" ON "WorkOrderAttachment"("workspaceId", "id");

-- AddForeignKey
ALTER TABLE "WorkOrderAttachment" ADD CONSTRAINT "WorkOrderAttachment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAttachment" ADD CONSTRAINT "WorkOrderAttachment_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAttachment" ADD CONSTRAINT "WorkOrderAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAttachment" ADD CONSTRAINT "WorkOrderAttachment_workspaceId_uploadedByAssignmentId_fkey" FOREIGN KEY ("workspaceId", "uploadedByAssignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
