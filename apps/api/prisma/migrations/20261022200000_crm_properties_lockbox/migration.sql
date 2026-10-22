-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "PropertyRelationshipRole" AS ENUM ('OWNER', 'PROPERTY_MANAGER');

-- CreateEnum
CREATE TYPE "PropertyAccessType" AS ENUM ('LOCKBOX', 'DOOR_CODE', 'ACCESS_INSTRUCTIONS', 'KEY_LOCATION', 'OTHER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "companyName" VARCHAR(160),
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyManager" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "companyName" VARCHAR(160),
    "email" VARCHAR(254),
    "phone" VARCHAR(40),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PropertyManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "addressLine1" VARCHAR(200) NOT NULL,
    "addressLine2" VARCHAR(200),
    "city" VARCHAR(120) NOT NULL,
    "state" VARCHAR(80) NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'US',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyRelationship" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "customerId" UUID,
    "propertyManagerId" UUID,
    "role" "PropertyRelationshipRole" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAccessCredential" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "type" "PropertyAccessType" NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "nonce" VARCHAR(32) NOT NULL,
    "authTag" VARCHAR(32) NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PropertyAccessCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveDataAccessEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "credentialId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(20) NOT NULL DEFAULT 'VIEW',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveDataAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_workspaceId_name_idx" ON "Customer"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Customer_workspaceId_email_idx" ON "Customer"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_workspaceId_id_key" ON "Customer"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "PropertyManager_workspaceId_name_idx" ON "PropertyManager"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "PropertyManager_workspaceId_email_idx" ON "PropertyManager"("workspaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyManager_workspaceId_id_key" ON "PropertyManager"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "Property_workspaceId_city_state_idx" ON "Property"("workspaceId", "city", "state");

-- CreateIndex
CREATE INDEX "Property_workspaceId_postalCode_idx" ON "Property"("workspaceId", "postalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Property_workspaceId_id_key" ON "Property"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "PropertyRelationship_workspaceId_propertyId_startDate_idx" ON "PropertyRelationship"("workspaceId", "propertyId", "startDate");

-- CreateIndex
CREATE INDEX "PropertyRelationship_workspaceId_customerId_idx" ON "PropertyRelationship"("workspaceId", "customerId");

-- CreateIndex
CREATE INDEX "PropertyRelationship_workspaceId_propertyManagerId_idx" ON "PropertyRelationship"("workspaceId", "propertyManagerId");

-- CreateIndex
CREATE INDEX "PropertyAccessCredential_workspaceId_propertyId_isActive_idx" ON "PropertyAccessCredential"("workspaceId", "propertyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAccessCredential_workspaceId_id_key" ON "PropertyAccessCredential"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "SensitiveDataAccessEvent_workspaceId_credentialId_occurredA_idx" ON "SensitiveDataAccessEvent"("workspaceId", "credentialId", "occurredAt");

-- CreateIndex
CREATE INDEX "SensitiveDataAccessEvent_actorUserId_occurredAt_idx" ON "SensitiveDataAccessEvent"("actorUserId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyManager" ADD CONSTRAINT "PropertyManager_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRelationship" ADD CONSTRAINT "PropertyRelationship_workspaceId_propertyId_fkey" FOREIGN KEY ("workspaceId", "propertyId") REFERENCES "Property"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRelationship" ADD CONSTRAINT "PropertyRelationship_workspaceId_customerId_fkey" FOREIGN KEY ("workspaceId", "customerId") REFERENCES "Customer"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRelationship" ADD CONSTRAINT "PropertyRelationship_workspaceId_propertyManagerId_fkey" FOREIGN KEY ("workspaceId", "propertyManagerId") REFERENCES "PropertyManager"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAccessCredential" ADD CONSTRAINT "PropertyAccessCredential_workspaceId_propertyId_fkey" FOREIGN KEY ("workspaceId", "propertyId") REFERENCES "Property"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAccessCredential" ADD CONSTRAINT "PropertyAccessCredential_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveDataAccessEvent" ADD CONSTRAINT "SensitiveDataAccessEvent_workspaceId_credentialId_fkey" FOREIGN KEY ("workspaceId", "credentialId") REFERENCES "PropertyAccessCredential"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveDataAccessEvent" ADD CONSTRAINT "SensitiveDataAccessEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce that each historical property relationship points to one party of the matching role.
ALTER TABLE "PropertyRelationship"
ADD CONSTRAINT "PropertyRelationship_party_role_check"
CHECK (
    ("role" = 'OWNER' AND "customerId" IS NOT NULL AND "propertyManagerId" IS NULL)
    OR
    ("role" = 'PROPERTY_MANAGER' AND "customerId" IS NULL AND "propertyManagerId" IS NOT NULL)
);
