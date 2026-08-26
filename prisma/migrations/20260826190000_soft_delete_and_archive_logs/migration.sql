-- AlterTable
ALTER TABLE "Facility" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rebuttal" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ArchivedModerationLog" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "fromStatus" "RebuttalStatus" NOT NULL,
    "toStatus" "RebuttalStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatorId" TEXT NOT NULL,
    "rebuttalId" TEXT NOT NULL,

    CONSTRAINT "ArchivedModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchivedModerationLog_originalId_key" ON "ArchivedModerationLog"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedModerationLog_rebuttalId_idx" ON "ArchivedModerationLog"("rebuttalId");

-- CreateIndex
CREATE INDEX "ArchivedModerationLog_moderatorId_idx" ON "ArchivedModerationLog"("moderatorId");

-- CreateIndex
CREATE INDEX "ArchivedModerationLog_createdAt_idx" ON "ArchivedModerationLog"("createdAt");

-- CreateIndex
CREATE INDEX "ArchivedModerationLog_archivedAt_idx" ON "ArchivedModerationLog"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedModerationLog_originalId_idx" ON "ArchivedModerationLog"("originalId");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_idx" ON "Facility"("deletedAt");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_name_idx" ON "Facility"("deletedAt", "name");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_slug_idx" ON "Facility"("deletedAt", "slug");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_county_idx" ON "Facility"("deletedAt", "county");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_city_idx" ON "Facility"("deletedAt", "city");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_updatedAt_idx" ON "Facility"("deletedAt", "updatedAt");

-- CreateIndex
CREATE INDEX "Facility_deletedAt_organizationId_idx" ON "Facility"("deletedAt", "organizationId");

-- CreateIndex
CREATE INDEX "Rebuttal_deletedAt_idx" ON "Rebuttal"("deletedAt");

-- CreateIndex
CREATE INDEX "Rebuttal_deletedAt_facilityId_status_idx" ON "Rebuttal"("deletedAt", "facilityId", "status");

-- CreateIndex
CREATE INDEX "Rebuttal_deletedAt_status_updatedAt_idx" ON "Rebuttal"("deletedAt", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Rebuttal_deletedAt_userId_status_idx" ON "Rebuttal"("deletedAt", "userId", "status");
