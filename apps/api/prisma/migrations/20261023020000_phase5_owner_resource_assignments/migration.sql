-- AlterTable
ALTER TABLE "WorkOrderAssignment" ADD COLUMN     "ownerUserId" UUID,
ALTER COLUMN "employeeId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "WorkOrderAssignment_workspaceId_ownerUserId_revokedAt_idx" ON "WorkOrderAssignment"("workspaceId", "ownerUserId", "revokedAt");

-- AddForeignKey
ALTER TABLE "WorkOrderAssignment" ADD CONSTRAINT "WorkOrderAssignment_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
