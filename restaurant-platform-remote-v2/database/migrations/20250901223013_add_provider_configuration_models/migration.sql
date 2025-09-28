-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('dhub', 'talabat', 'careem', 'careemexpress', 'jahez', 'deliveroo', 'yallow', 'jooddelivery', 'topdeliver', 'nashmi', 'tawasi', 'delivergy', 'utrac', 'local_delivery');

-- CreateEnum
CREATE TYPE "ProviderOrderLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderOrderLogAction" AS ENUM ('CONNECTION_TEST', 'CREATE_ORDER', 'CANCEL_ORDER', 'UPDATE_ORDER', 'WEBHOOK_RECEIVED');

-- Drop the problematic constraint first
ALTER TABLE "global_locations" DROP CONSTRAINT IF EXISTS "global_locations_unique_location";

-- CreateTable
CREATE TABLE "CompanyProviderConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "configuration" JSONB NOT NULL,
    "credentials" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "maxDistance" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "baseFee" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "feePerKm" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "avgDeliveryTime" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "lastModifiedById" TEXT,

    CONSTRAINT "CompanyProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchProviderMapping" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "companyProviderConfigId" TEXT NOT NULL,
    "providerBranchId" TEXT NOT NULL,
    "providerSiteId" TEXT,
    "branchConfiguration" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "minOrderValue" DOUBLE PRECISION,
    "maxOrderValue" DOUBLE PRECISION,
    "supportedPaymentMethods" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "lastModifiedById" TEXT,

    CONSTRAINT "BranchProviderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOrderLog" (
    "id" TEXT NOT NULL,
    "companyProviderConfigId" TEXT NOT NULL,
    "branchProviderMappingId" TEXT,
    "orderId" TEXT,
    "providerOrderId" TEXT,
    "action" "ProviderOrderLogAction" NOT NULL,
    "status" "ProviderOrderLogStatus" NOT NULL,
    "requestData" JSONB,
    "responseData" JSONB,
    "errorMessage" TEXT,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "ProviderOrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProviderConfig_companyId_providerType_key" ON "CompanyProviderConfig"("companyId", "providerType");

-- CreateIndex
CREATE INDEX "CompanyProviderConfig_companyId_idx" ON "CompanyProviderConfig"("companyId");

-- CreateIndex
CREATE INDEX "CompanyProviderConfig_providerType_idx" ON "CompanyProviderConfig"("providerType");

-- CreateIndex
CREATE INDEX "CompanyProviderConfig_isActive_idx" ON "CompanyProviderConfig"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BranchProviderMapping_branchId_companyProviderConfigId_key" ON "BranchProviderMapping"("branchId", "companyProviderConfigId");

-- CreateIndex
CREATE INDEX "BranchProviderMapping_branchId_idx" ON "BranchProviderMapping"("branchId");

-- CreateIndex
CREATE INDEX "BranchProviderMapping_companyProviderConfigId_idx" ON "BranchProviderMapping"("companyProviderConfigId");

-- CreateIndex
CREATE INDEX "BranchProviderMapping_isActive_idx" ON "BranchProviderMapping"("isActive");

-- CreateIndex
CREATE INDEX "ProviderOrderLog_companyProviderConfigId_idx" ON "ProviderOrderLog"("companyProviderConfigId");

-- CreateIndex
CREATE INDEX "ProviderOrderLog_action_idx" ON "ProviderOrderLog"("action");

-- CreateIndex
CREATE INDEX "ProviderOrderLog_status_idx" ON "ProviderOrderLog"("status");

-- CreateIndex
CREATE INDEX "ProviderOrderLog_createdAt_idx" ON "ProviderOrderLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CompanyProviderConfig" ADD CONSTRAINT "CompanyProviderConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProviderConfig" ADD CONSTRAINT "CompanyProviderConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProviderConfig" ADD CONSTRAINT "CompanyProviderConfig_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProviderMapping" ADD CONSTRAINT "BranchProviderMapping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProviderMapping" ADD CONSTRAINT "BranchProviderMapping_companyProviderConfigId_fkey" FOREIGN KEY ("companyProviderConfigId") REFERENCES "CompanyProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProviderMapping" ADD CONSTRAINT "BranchProviderMapping_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchProviderMapping" ADD CONSTRAINT "BranchProviderMapping_lastModifiedById_fkey" FOREIGN KEY ("lastModifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderLog" ADD CONSTRAINT "ProviderOrderLog_companyProviderConfigId_fkey" FOREIGN KEY ("companyProviderConfigId") REFERENCES "CompanyProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderLog" ADD CONSTRAINT "ProviderOrderLog_branchProviderMappingId_fkey" FOREIGN KEY ("branchProviderMappingId") REFERENCES "BranchProviderMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOrderLog" ADD CONSTRAINT "ProviderOrderLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update provider orders relation (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'DeliveryProviderOrder') THEN
        ALTER TABLE "DeliveryProviderOrder" ADD CONSTRAINT "DeliveryProviderOrder_companyProviderConfigId_fkey" FOREIGN KEY ("companyProviderConfigId") REFERENCES "CompanyProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        ALTER TABLE "DeliveryProviderOrder" ADD CONSTRAINT "DeliveryProviderOrder_branchProviderMappingId_fkey" FOREIGN KEY ("branchProviderMappingId") REFERENCES "BranchProviderMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;