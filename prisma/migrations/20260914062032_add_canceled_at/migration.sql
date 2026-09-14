-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TakedownReason" AS ENUM ('PRIVACY_PII_PHI', 'INACCURATE_INFORMATION', 'DEFAMATION_HARASSMENT', 'COURT_ORDER', 'COPYRIGHT_IP', 'OTHER');

-- DropIndex
DROP INDEX "Rebuttal_watermarkedUrl_idx";

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TakedownRequest" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "facilityOrRebuttal" TEXT NOT NULL,
    "reason" "TakedownReason" NOT NULL,
    "reasonDetails" TEXT,
    "supportingInfo" TEXT NOT NULL,
    "status" "TakedownStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNotes" TEXT,
    "isEmergencyTakedown" BOOLEAN NOT NULL DEFAULT false,
    "emergencyUnpublishedAt" TIMESTAMP(3),
    "rebuttalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TakedownRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TakedownRequest_ticketNumber_key" ON "TakedownRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "TakedownRequest_status_idx" ON "TakedownRequest"("status");

-- CreateIndex
CREATE INDEX "TakedownRequest_submittedAt_idx" ON "TakedownRequest"("submittedAt");

-- CreateIndex
CREATE INDEX "TakedownRequest_slaDeadline_idx" ON "TakedownRequest"("slaDeadline");

-- CreateIndex
CREATE INDEX "TakedownRequest_ticketNumber_idx" ON "TakedownRequest"("ticketNumber");

-- CreateIndex
CREATE INDEX "TakedownRequest_assignedToId_idx" ON "TakedownRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "TakedownRequest_rebuttalId_idx" ON "TakedownRequest"("rebuttalId");

-- CreateIndex
CREATE INDEX "CitationDeadline_userId_dueDate_idx" ON "CitationDeadline"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Facility_county_idx" ON "Facility"("county");

-- CreateIndex
CREATE INDEX "Facility_city_idx" ON "Facility"("city");

-- CreateIndex
CREATE INDEX "Facility_capacity_idx" ON "Facility"("capacity");

-- CreateIndex
CREATE INDEX "Facility_updatedAt_idx" ON "Facility"("updatedAt");

-- CreateIndex
CREATE INDEX "Facility_facilityNumber_idx" ON "Facility"("facilityNumber");

-- CreateIndex
CREATE INDEX "Facility_organizationId_createdAt_idx" ON "Facility"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_rebuttalId_createdAt_idx" ON "ModerationLog"("rebuttalId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationLog_createdAt_idx" ON "ModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "Rebuttal_facilityId_status_idx" ON "Rebuttal"("facilityId", "status");

-- CreateIndex
CREATE INDEX "Rebuttal_status_updatedAt_idx" ON "Rebuttal"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Rebuttal_userId_status_idx" ON "Rebuttal"("userId", "status");

-- CreateIndex
CREATE INDEX "Template_isActive_category_idx" ON "Template"("isActive", "category");

-- CreateIndex
CREATE INDEX "Template_downloadCount_idx" ON "Template"("downloadCount");

-- CreateIndex
CREATE INDEX "Template_createdAt_idx" ON "Template"("createdAt");

-- CreateIndex
CREATE INDEX "TemplateDownload_userId_createdAt_idx" ON "TemplateDownload"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TakedownRequest" ADD CONSTRAINT "TakedownRequest_rebuttalId_fkey" FOREIGN KEY ("rebuttalId") REFERENCES "Rebuttal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
