-- CreateEnum
CREATE TYPE "ConnectorDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "ConnectorEventStatus" AS ENUM ('RECEIVED', 'SENT', 'DELIVERED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "ConnectorEventLog" (
    "id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "direction" "ConnectorDirection" NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ConnectorEventStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectorEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectorEventLog_connector_direction_idx" ON "ConnectorEventLog"("connector", "direction");

-- CreateIndex
CREATE INDEX "ConnectorEventLog_eventType_idx" ON "ConnectorEventLog"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_contactId_key" ON "PortalUser"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_email_key" ON "PortalUser"("email");

-- CreateIndex
CREATE INDEX "PortalUser_companyId_idx" ON "PortalUser"("companyId");

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
