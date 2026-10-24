-- CreateEnum
CREATE TYPE "WorkOrderProgressStage" AS ENUM ('STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WorkOrderAssignmentCommunicationStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "WorkOrderEvent" ADD COLUMN     "actorAssignmentId" UUID,
ALTER COLUMN "actorUserId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "WorkOrderAssignment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "activeKey" VARCHAR(100),
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "WorkOrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAccessCode" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAssignmentCommunication" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    "recipient" VARCHAR(254) NOT NULL,
    "status" "WorkOrderAssignmentCommunicationStatus" NOT NULL,
    "failureCode" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderAssignmentCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderProgressEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "stage" "WorkOrderProgressStage",
    "note" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderSensitiveDataAccessEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "credentialId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderSensitiveDataAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderAssignment_workspaceId_workOrderId_revokedAt_idx" ON "WorkOrderAssignment"("workspaceId", "workOrderId", "revokedAt");

-- CreateIndex
CREATE INDEX "WorkOrderAssignment_workspaceId_employeeId_revokedAt_idx" ON "WorkOrderAssignment"("workspaceId", "employeeId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAssignment_workspaceId_id_key" ON "WorkOrderAssignment"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAssignment_workspaceId_activeKey_key" ON "WorkOrderAssignment"("workspaceId", "activeKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAccessCode_tokenHash_key" ON "WorkOrderAccessCode"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkOrderAccessCode_workspaceId_assignmentId_revokedAt_expi_idx" ON "WorkOrderAccessCode"("workspaceId", "assignmentId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkOrderAssignmentCommunication_workspaceId_assignmentId_c_idx" ON "WorkOrderAssignmentCommunication"("workspaceId", "assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrderProgressEvent_workspaceId_workOrderId_occurredAt_idx" ON "WorkOrderProgressEvent"("workspaceId", "workOrderId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderProgressEvent_workspaceId_assignmentId_occurredAt_idx" ON "WorkOrderProgressEvent"("workspaceId", "assignmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderSensitiveDataAccessEvent_workspaceId_credentialId__idx" ON "WorkOrderSensitiveDataAccessEvent"("workspaceId", "credentialId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderSensitiveDataAccessEvent_workspaceId_assignmentId__idx" ON "WorkOrderSensitiveDataAccessEvent"("workspaceId", "assignmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_workspaceId_id_key" ON "Employee"("workspaceId", "id");

-- AddForeignKey
ALTER TABLE "WorkOrderEvent" ADD CONSTRAINT "WorkOrderEvent_workspaceId_actorAssignmentId_fkey" FOREIGN KEY ("workspaceId", "actorAssignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_workspaceId_employeeId_fkey" FOREIGN KEY ("workspaceId", "employeeId") REFERENCES "Employee"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAccessCode" ADD CONSTRAINT "WorkOrderAccessCode_workspaceId_assignmentId_fkey" FOREIGN KEY ("workspaceId", "assignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAccessCode" ADD CONSTRAINT "WorkOrderAccessCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAssignmentCommunication" ADD CONSTRAINT "WorkOrderAssignmentCommunication_workspaceId_assignmentId_fkey" FOREIGN KEY ("workspaceId", "assignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderProgressEvent" ADD CONSTRAINT "WorkOrderProgressEvent_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderProgressEvent" ADD CONSTRAINT "WorkOrderProgressEvent_workspaceId_assignmentId_fkey" FOREIGN KEY ("workspaceId", "assignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSensitiveDataAccessEvent" ADD CONSTRAINT "WorkOrderSensitiveDataAccessEvent_workspaceId_credentialId_fkey" FOREIGN KEY ("workspaceId", "credentialId") REFERENCES "PropertyAccessCredential"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSensitiveDataAccessEvent" ADD CONSTRAINT "WorkOrderSensitiveDataAccessEvent_workspaceId_assignmentId_fkey" FOREIGN KEY ("workspaceId", "assignmentId") REFERENCES "WorkOrderAssignment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
