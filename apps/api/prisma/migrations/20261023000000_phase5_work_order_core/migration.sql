-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING_SCHEDULE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELED');

-- CreateEnum
CREATE TYPE "WorkOrderBillingStatus" AS ENUM ('PENDING_TO_INVOICE', 'INVOICED', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "WorkOrderPricingType" AS ENUM ('FIXED', 'TIME_AND_MATERIALS');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "customerId" UUID,
    "propertyManagerId" UUID,
    "propertyId" UUID NOT NULL,
    "serviceRequestId" UUID,
    "estimateId" UUID,
    "estimateVersionId" UUID,
    "createdByUserId" UUID NOT NULL,
    "billToNameSnapshot" VARCHAR(160) NOT NULL,
    "billToEmailSnapshot" VARCHAR(254),
    "billToPhoneSnapshot" VARCHAR(40),
    "propertyAddressSnapshot" VARCHAR(500) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "scopeSnapshot" TEXT NOT NULL,
    "pricingType" "WorkOrderPricingType" NOT NULL,
    "agreedSubtotal" DECIMAL(12,2),
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL(7,4),
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "agreedTotal" DECIMAL(12,2),
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'NORMAL',
    "scheduledStartAt" TIMESTAMPTZ(3),
    "scheduledEndAt" TIMESTAMPTZ(3),
    "estimatedDurationMinutes" INTEGER,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING_SCHEDULE',
    "billingStatus" "WorkOrderBillingStatus" NOT NULL DEFAULT 'PENDING_TO_INVOICE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderLine" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "lineTotal" DECIMAL(12,2),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "fromStatus" "WorkOrderStatus",
    "toStatus" "WorkOrderStatus" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "reason" VARCHAR(1000),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderScheduleEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "previousStartAt" TIMESTAMPTZ(3),
    "previousEndAt" TIMESTAMPTZ(3),
    "nextStartAt" TIMESTAMPTZ(3) NOT NULL,
    "nextEndAt" TIMESTAMPTZ(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "actorUserId" UUID NOT NULL,
    "reason" VARCHAR(1000),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderScheduleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPriorityEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "from" "WorkOrderPriority" NOT NULL,
    "to" "WorkOrderPriority" NOT NULL,
    "actorUserId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderPriorityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrder_workspaceId_status_createdAt_idx" ON "WorkOrder"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_workspaceId_propertyId_createdAt_idx" ON "WorkOrder"("workspaceId", "propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_workspaceId_scheduledStartAt_scheduledEndAt_idx" ON "WorkOrder"("workspaceId", "scheduledStartAt", "scheduledEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workspaceId_id_key" ON "WorkOrder"("workspaceId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workspaceId_number_key" ON "WorkOrder"("workspaceId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workspaceId_estimateId_key" ON "WorkOrder"("workspaceId", "estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_workspaceId_estimateId_estimateVersionId_key" ON "WorkOrder"("workspaceId", "estimateId", "estimateVersionId");

-- CreateIndex
CREATE INDEX "WorkOrderLine_workspaceId_workOrderId_idx" ON "WorkOrderLine"("workspaceId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderLine_workspaceId_workOrderId_position_key" ON "WorkOrderLine"("workspaceId", "workOrderId", "position");

-- CreateIndex
CREATE INDEX "WorkOrderEvent_workspaceId_workOrderId_occurredAt_idx" ON "WorkOrderEvent"("workspaceId", "workOrderId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderScheduleEvent_workspaceId_workOrderId_occurredAt_idx" ON "WorkOrderScheduleEvent"("workspaceId", "workOrderId", "occurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderPriorityEvent_workspaceId_workOrderId_occurredAt_idx" ON "WorkOrderPriorityEvent"("workspaceId", "workOrderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateVersion_workspaceId_estimateId_id_key" ON "EstimateVersion"("workspaceId", "estimateId", "id");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_customerId_fkey" FOREIGN KEY ("workspaceId", "customerId") REFERENCES "Customer"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_propertyManagerId_fkey" FOREIGN KEY ("workspaceId", "propertyManagerId") REFERENCES "PropertyManager"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_propertyId_fkey" FOREIGN KEY ("workspaceId", "propertyId") REFERENCES "Property"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_serviceRequestId_fkey" FOREIGN KEY ("workspaceId", "serviceRequestId") REFERENCES "ServiceRequest"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_estimateId_fkey" FOREIGN KEY ("workspaceId", "estimateId") REFERENCES "Estimate"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_workspaceId_estimateId_estimateVersionId_fkey" FOREIGN KEY ("workspaceId", "estimateId", "estimateVersionId") REFERENCES "EstimateVersion"("workspaceId", "estimateId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderLine" ADD CONSTRAINT "WorkOrderLine_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEvent" ADD CONSTRAINT "WorkOrderEvent_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEvent" ADD CONSTRAINT "WorkOrderEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderScheduleEvent" ADD CONSTRAINT "WorkOrderScheduleEvent_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderScheduleEvent" ADD CONSTRAINT "WorkOrderScheduleEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPriorityEvent" ADD CONSTRAINT "WorkOrderPriorityEvent_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPriorityEvent" ADD CONSTRAINT "WorkOrderPriorityEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
