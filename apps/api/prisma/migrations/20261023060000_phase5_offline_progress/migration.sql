-- CreateEnum
CREATE TYPE "OfflineProgressSyncStatus" AS ENUM ('APPLIED', 'REVIEW_REQUIRED', 'OWNER_APPLIED', 'OWNER_ACKNOWLEDGED', 'DISMISSED');

-- AlterTable
ALTER TABLE "WorkOrderSensitiveDataAccessEvent" ADD COLUMN     "clientEventId" VARCHAR(36),
ADD COLUMN     "conflictReason" VARCHAR(80),
ADD COLUMN     "deviceOccurredAt" TIMESTAMPTZ(3),
ADD COLUMN     "resolutionReason" VARCHAR(1000),
ADD COLUMN     "resolvedAt" TIMESTAMPTZ(3),
ADD COLUMN     "resolvedByUserId" UUID,
ADD COLUMN     "reviewStatus" "OfflineProgressSyncStatus",
ADD COLUMN     "wasOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OfflineProgressEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "clientEventId" VARCHAR(64) NOT NULL,
    "stage" "WorkOrderProgressStage",
    "note" TEXT,
    "baseStatus" "WorkOrderStatus" NOT NULL,
    "baseWorkOrderUpdatedAt" TIMESTAMPTZ(3) NOT NULL,
    "requestedStatus" "WorkOrderStatus" NOT NULL,
    "deviceOccurredAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" "OfflineProgressSyncStatus" NOT NULL,
    "conflictReason" VARCHAR(80),
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedByUserId" UUID,
    "resolutionReason" VARCHAR(1000),

    CONSTRAINT "OfflineProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfflineProgressEvent_workspaceId_workOrderId_syncStatus_dev_idx" ON "OfflineProgressEvent"("workspaceId", "workOrderId", "syncStatus", "deviceOccurredAt");

-- CreateIndex
CREATE INDEX "OfflineProgressEvent_workspaceId_assignmentId_receivedAt_idx" ON "OfflineProgressEvent"("workspaceId", "assignmentId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineProgressEvent_workspaceId_assignmentId_clientEventId_key" ON "OfflineProgressEvent"("workspaceId", "assignmentId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderSensitiveDataAccessEvent_workspaceId_assignmentId__key" ON "WorkOrderSensitiveDataAccessEvent"("workspaceId", "assignmentId", "clientEventId");

-- AddForeignKey
ALTER TABLE "WorkOrderSensitiveDataAccessEvent" ADD CONSTRAINT "WorkOrderSensitiveDataAccessEvent_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineProgressEvent" ADD CONSTRAINT "OfflineProgressEvent_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineProgressEvent" ADD CONSTRAINT "OfflineProgressEvent_workspaceId_assignmentId_fkey" FOREIGN KEY ("workspaceId", "assignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineProgressEvent" ADD CONSTRAINT "OfflineProgressEvent_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
