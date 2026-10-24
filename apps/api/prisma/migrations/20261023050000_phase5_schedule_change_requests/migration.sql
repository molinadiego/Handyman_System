-- CreateEnum
CREATE TYPE "WorkOrderContactType" AS ENUM ('TENANT', 'CUSTOMER_CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderCommunicationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleChangeRequestType" AS ENUM ('CONFIRM', 'RESCHEDULE', 'CANCEL');

-- CreateEnum
CREATE TYPE "ScheduleChangeRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScheduleChangeEventType" AS ENUM ('REQUESTED', 'CONFIRMED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkOrderContact" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "type" "WorkOrderContactType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkOrderContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAppointmentToken" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "recipientNameSnapshot" VARCHAR(160) NOT NULL,
    "recipientEmailSnapshot" VARCHAR(254) NOT NULL,
    "scheduledStartAtSnapshot" TIMESTAMPTZ(3) NOT NULL,
    "scheduledEndAtSnapshot" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderAppointmentToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderCommunication" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    "recipient" VARCHAR(254) NOT NULL,
    "status" "WorkOrderCommunicationStatus" NOT NULL,
    "failureCode" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChangeRequest" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "appointmentTokenId" UUID,
    "type" "ScheduleChangeRequestType" NOT NULL,
    "status" "ScheduleChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requesterName" VARCHAR(160) NOT NULL,
    "requesterEmailSnapshot" VARCHAR(254),
    "reason" VARCHAR(1000),
    "scheduledStartAtSnapshot" TIMESTAMPTZ(3) NOT NULL,
    "scheduledEndAtSnapshot" TIMESTAMPTZ(3) NOT NULL,
    "proposedStartAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMPTZ(3),
    "decisionReason" VARCHAR(1000),

    CONSTRAINT "ScheduleChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChangeRequestEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fromStatus" "ScheduleChangeRequestStatus",
    "toStatus" "ScheduleChangeRequestStatus" NOT NULL,
    "type" "ScheduleChangeEventType" NOT NULL,
    "actorUserId" UUID,
    "actorNameSnapshot" VARCHAR(160),
    "reason" VARCHAR(1000),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleChangeRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderContact_workspaceId_email_idx" ON "WorkOrderContact"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderContact_workspaceId_id_key" ON "WorkOrderContact"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderContact_workspaceId_workOrderId_key" ON "WorkOrderContact"("workspaceId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAppointmentToken_tokenHash_key" ON "WorkOrderAppointmentToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkOrderAppointmentToken_workspaceId_workOrderId_consumedA_idx" ON "WorkOrderAppointmentToken"("workspaceId", "workOrderId", "consumedAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderAppointmentToken_workspaceId_id_key" ON "WorkOrderAppointmentToken"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "WorkOrderCommunication_workspaceId_workOrderId_createdAt_idx" ON "WorkOrderCommunication"("workspaceId", "workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequest_workspaceId_workOrderId_status_create_idx" ON "ScheduleChangeRequest"("workspaceId", "workOrderId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleChangeRequest_workspaceId_id_key" ON "ScheduleChangeRequest"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "ScheduleChangeRequestEvent_workspaceId_requestId_occurredAt_idx" ON "ScheduleChangeRequestEvent"("workspaceId", "requestId", "occurredAt");

-- AddForeignKey
ALTER TABLE "WorkOrderContact" ADD CONSTRAINT "WorkOrderContact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderContact" ADD CONSTRAINT "WorkOrderContact_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderContact" ADD CONSTRAINT "WorkOrderContact_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAppointmentToken" ADD CONSTRAINT "WorkOrderAppointmentToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAppointmentToken" ADD CONSTRAINT "WorkOrderAppointmentToken_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAppointmentToken" ADD CONSTRAINT "WorkOrderAppointmentToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCommunication" ADD CONSTRAINT "WorkOrderCommunication_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCommunication" ADD CONSTRAINT "WorkOrderCommunication_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_workspaceId_appointmentTokenId_fkey" FOREIGN KEY ("workspaceId", "appointmentTokenId") REFERENCES "WorkOrderAppointmentToken"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequest" ADD CONSTRAINT "ScheduleChangeRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequestEvent" ADD CONSTRAINT "ScheduleChangeRequestEvent_workspaceId_requestId_fkey" FOREIGN KEY ("workspaceId", "requestId") REFERENCES "ScheduleChangeRequest"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeRequestEvent" ADD CONSTRAINT "ScheduleChangeRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
