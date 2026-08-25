-- CreateEnum
CREATE TYPE "LogisticsMode" AS ENUM ('INTERNE', 'SOUS_TRAITANT', 'INCONNU');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('WEEKLY', 'PRE_MIGRATION', 'MANUAL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupStorage" AS ENUM ('LOCAL', 'S3');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "logisticsMode" "LogisticsMode" NOT NULL DEFAULT 'INCONNU',
ADD COLUMN     "logisticsModeConfidence" INTEGER,
ADD COLUMN     "logisticsModeSource" TEXT,
ADD COLUMN     "logisticsSubcontractorName" TEXT;

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "storage" "BackupStorage" NOT NULL,
    "location" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "modelCounts" JSONB,
    "relatedMigration" TEXT,
    "errorMessage" TEXT,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupRecord_type_createdAt_idx" ON "BackupRecord"("type", "createdAt");
