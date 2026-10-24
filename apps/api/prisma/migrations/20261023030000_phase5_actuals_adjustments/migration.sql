-- CreateEnum
CREATE TYPE "MaterialPayerType" AS ENUM ('OWNER', 'EMPLOYEE', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderAdjustmentType" AS ENUM ('SCOPE_CHANGE', 'PRICE_CHANGE', 'TIME_AND_MATERIALS_CHARGE');

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "note" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByUserId" UUID,
    "voidReason" VARCHAR(1000),

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialLine" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "actualCost" DECIMAL(12,2) NOT NULL,
    "customerCharge" DECIMAL(12,2),
    "payerType" "MaterialPayerType" NOT NULL,
    "payerEmployeeId" UUID,
    "payerDescription" VARCHAR(160),
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMPTZ(3),
    "voidedByUserId" UUID,
    "voidReason" VARCHAR(1000),

    CONSTRAINT "MaterialLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderAdjustment" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "workOrderId" UUID NOT NULL,
    "type" "WorkOrderAdjustmentType" NOT NULL,
    "amountDelta" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "scopeChange" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkLog_workspaceId_workOrderId_startedAt_idx" ON "WorkLog"("workspaceId", "workOrderId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkLog_workspaceId_id_key" ON "WorkLog"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "MaterialLine_workspaceId_workOrderId_createdAt_idx" ON "MaterialLine"("workspaceId", "workOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "MaterialLine_workspaceId_payerEmployeeId_idx" ON "MaterialLine"("workspaceId", "payerEmployeeId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialLine_workspaceId_id_key" ON "MaterialLine"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "WorkOrderAdjustment_workspaceId_workOrderId_createdAt_idx" ON "WorkOrderAdjustment"("workspaceId", "workOrderId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLine" ADD CONSTRAINT "MaterialLine_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLine" ADD CONSTRAINT "MaterialLine_workspaceId_payerEmployeeId_fkey" FOREIGN KEY ("workspaceId", "payerEmployeeId") REFERENCES "Employee"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLine" ADD CONSTRAINT "MaterialLine_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialLine" ADD CONSTRAINT "MaterialLine_voidedByUserId_fkey" FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAdjustment" ADD CONSTRAINT "WorkOrderAdjustment_workspaceId_workOrderId_fkey" FOREIGN KEY ("workspaceId", "workOrderId") REFERENCES "WorkOrder"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderAdjustment" ADD CONSTRAINT "WorkOrderAdjustment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
