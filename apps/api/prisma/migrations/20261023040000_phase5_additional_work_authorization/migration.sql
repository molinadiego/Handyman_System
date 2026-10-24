-- CreateEnum
CREATE TYPE "AdditionalWorkStatus" AS ENUM ('PENDING_AUTHORIZATION', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AdditionalWorkAuthorizationMethod" AS ENUM ('IN_PERSON', 'PHONE');

-- CreateEnum
CREATE TYPE "AdditionalWorkEventType" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "AdditionalWork" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "approvedAmount" DECIMAL(12,2),
    "status" "AdditionalWorkStatus" NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
    "authorizationMethod" "AdditionalWorkAuthorizationMethod",
    "authorizedByName" VARCHAR(160),
    "authorizationDetails" VARCHAR(2000),
    "authorizedAt" TIMESTAMPTZ(3),
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalWorkEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "additionalWorkId" UUID NOT NULL,
    "fromStatus" "AdditionalWorkStatus",
    "toStatus" "AdditionalWorkStatus" NOT NULL,
    "type" "AdditionalWorkEventType" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "reason" VARCHAR(1000),
    "authorizationMethod" "AdditionalWorkAuthorizationMethod",
    "authorizedByName" VARCHAR(160),
    "approvedAmount" DECIMAL(12,2),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdditionalWorkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalWork_workspaceId_workOrderId_status_createdAt_idx" ON "AdditionalWork"("workspaceId", "workOrderId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalWork_workspaceId_id_key" ON "AdditionalWork"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "AdditionalWorkEvent_workspaceId_additionalWorkId_occurredAt_idx" ON "AdditionalWorkEvent"("workspaceId", "additionalWorkId", "occurredAt");

-- AddForeignKey
ALTER TABLE "AdditionalWork" ADD CONSTRAINT "AdditionalWork_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalWork" ADD CONSTRAINT "AdditionalWork_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalWork" ADD CONSTRAINT "AdditionalWork_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalWorkEvent" ADD CONSTRAINT "AdditionalWorkEvent_workspaceId_additionalWorkId_fkey" FOREIGN KEY ("workspaceId", "additionalWorkId") REFERENCES "AdditionalWork"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalWorkEvent" ADD CONSTRAINT "AdditionalWorkEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
