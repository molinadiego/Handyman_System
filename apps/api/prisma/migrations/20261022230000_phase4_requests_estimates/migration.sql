-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'ESTIMATED', 'AGREED_DIRECTLY', 'NOT_ACCEPTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EstimateDiscountType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "EstimateEventType" AS ENUM ('CREATED', 'VERSION_CREATED', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EstimateCommunicationStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "requesterName" VARCHAR(160) NOT NULL,
    "requesterEmail" VARCHAR(254),
    "requesterPhone" VARCHAR(40),
    "customerId" UUID,
    "propertyManagerId" UUID,
    "propertyId" UUID,
    "description" TEXT NOT NULL,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fromStatus" "ServiceRequestStatus",
    "toStatus" "ServiceRequestStatus" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "customerId" UUID,
    "propertyManagerId" UUID,
    "propertyId" UUID NOT NULL,
    "serviceRequestId" UUID,
    "createdByUserId" UUID NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "latestSentVersionNumber" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "businessNameSnapshot" VARCHAR(160) NOT NULL,
    "recipientNameSnapshot" VARCHAR(160) NOT NULL,
    "recipientEmailSnapshot" VARCHAR(254),
    "propertyAddressSnapshot" VARCHAR(500) NOT NULL,
    "scopeSnapshot" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2),
    "discountType" "EstimateDiscountType",
    "discountValue" DECIMAL(12,4),
    "discountAmount" DECIMAL(12,2),
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "taxRateOverride" DECIMAL(7,4),
    "taxRate" DECIMAL(7,4),
    "taxBase" DECIMAL(12,2),
    "taxAmount" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "sentAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "acceptedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLine" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "estimateVersionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2),
    "lineTotal" DECIMAL(12,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateAcceptanceToken" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "estimateVersionId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateAcceptanceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "estimateVersionId" UUID,
    "type" "EstimateEventType" NOT NULL,
    "actorUserId" UUID,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "EstimateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateCommunication" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "estimateId" UUID NOT NULL,
    "estimateVersionId" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    "recipients" JSONB NOT NULL,
    "status" "EstimateCommunicationStatus" NOT NULL,
    "failureCode" VARCHAR(80),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequest_workspaceId_status_createdAt_idx" ON "ServiceRequest"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_workspaceId_propertyId_idx" ON "ServiceRequest"("workspaceId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_workspaceId_id_key" ON "ServiceRequest"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_workspaceId_requestId_createdAt_idx" ON "ServiceRequestEvent"("workspaceId", "requestId", "createdAt");

-- CreateIndex
CREATE INDEX "Estimate_workspaceId_status_updatedAt_idx" ON "Estimate"("workspaceId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_workspaceId_id_key" ON "Estimate"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_workspaceId_number_key" ON "Estimate"("workspaceId", "number");

-- CreateIndex
CREATE INDEX "EstimateVersion_workspaceId_estimateId_createdAt_idx" ON "EstimateVersion"("workspaceId", "estimateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateVersion_workspaceId_id_key" ON "EstimateVersion"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateVersion_workspaceId_estimateId_versionNumber_key" ON "EstimateVersion"("workspaceId", "estimateId", "versionNumber");

-- CreateIndex
CREATE INDEX "EstimateLine_workspaceId_estimateVersionId_idx" ON "EstimateLine"("workspaceId", "estimateVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateLine_workspaceId_estimateVersionId_position_key" ON "EstimateLine"("workspaceId", "estimateVersionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateAcceptanceToken_tokenHash_key" ON "EstimateAcceptanceToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EstimateAcceptanceToken_workspaceId_estimateId_estimateVers_idx" ON "EstimateAcceptanceToken"("workspaceId", "estimateId", "estimateVersionId", "expiresAt");

-- CreateIndex
CREATE INDEX "EstimateEvent_workspaceId_estimateId_occurredAt_idx" ON "EstimateEvent"("workspaceId", "estimateId", "occurredAt");

-- CreateIndex
CREATE INDEX "EstimateCommunication_workspaceId_estimateId_createdAt_idx" ON "EstimateCommunication"("workspaceId", "estimateId", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_workspaceId_customerId_fkey" FOREIGN KEY ("workspaceId", "customerId") REFERENCES "Customer"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_workspaceId_propertyManagerId_fkey" FOREIGN KEY ("workspaceId", "propertyManagerId") REFERENCES "PropertyManager"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_workspaceId_propertyId_fkey" FOREIGN KEY ("workspaceId", "propertyId") REFERENCES "Property"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_workspaceId_requestId_fkey" FOREIGN KEY ("workspaceId", "requestId") REFERENCES "ServiceRequest"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_workspaceId_customerId_fkey" FOREIGN KEY ("workspaceId", "customerId") REFERENCES "Customer"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_workspaceId_propertyManagerId_fkey" FOREIGN KEY ("workspaceId", "propertyManagerId") REFERENCES "PropertyManager"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_workspaceId_propertyId_fkey" FOREIGN KEY ("workspaceId", "propertyId") REFERENCES "Property"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_workspaceId_serviceRequestId_fkey" FOREIGN KEY ("workspaceId", "serviceRequestId") REFERENCES "ServiceRequest"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_workspaceId_estimateId_fkey" FOREIGN KEY ("workspaceId", "estimateId") REFERENCES "Estimate"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_workspaceId_estimateVersionId_fkey" FOREIGN KEY ("workspaceId", "estimateVersionId") REFERENCES "EstimateVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateAcceptanceToken" ADD CONSTRAINT "EstimateAcceptanceToken_workspaceId_estimateId_fkey" FOREIGN KEY ("workspaceId", "estimateId") REFERENCES "Estimate"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateAcceptanceToken" ADD CONSTRAINT "EstimateAcceptanceToken_workspaceId_estimateVersionId_fkey" FOREIGN KEY ("workspaceId", "estimateVersionId") REFERENCES "EstimateVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEvent" ADD CONSTRAINT "EstimateEvent_workspaceId_estimateId_fkey" FOREIGN KEY ("workspaceId", "estimateId") REFERENCES "Estimate"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEvent" ADD CONSTRAINT "EstimateEvent_workspaceId_estimateVersionId_fkey" FOREIGN KEY ("workspaceId", "estimateVersionId") REFERENCES "EstimateVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateEvent" ADD CONSTRAINT "EstimateEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateCommunication" ADD CONSTRAINT "EstimateCommunication_workspaceId_estimateId_fkey" FOREIGN KEY ("workspaceId", "estimateId") REFERENCES "Estimate"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateCommunication" ADD CONSTRAINT "EstimateCommunication_workspaceId_estimateVersionId_fkey" FOREIGN KEY ("workspaceId", "estimateVersionId") REFERENCES "EstimateVersion"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
