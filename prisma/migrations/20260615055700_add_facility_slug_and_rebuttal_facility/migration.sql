-- AlterTable: Add new columns to Facility
ALTER TABLE "Facility" ADD COLUMN "slug" TEXT;
ALTER TABLE "Facility" ADD COLUMN "facilityNumber" TEXT;
ALTER TABLE "Facility" ADD COLUMN "city" TEXT;
ALTER TABLE "Facility" ADD COLUMN "county" TEXT;
ALTER TABLE "Facility" ADD COLUMN "capacity" INTEGER;
ALTER TABLE "Facility" ADD COLUMN "ccldLink" TEXT;

-- Backfill slug for any existing facilities using the id so unique constraint doesn't fail
UPDATE "Facility" SET "slug" = id WHERE "slug" IS NULL;

-- Make slug NOT NULL and UNIQUE
ALTER TABLE "Facility" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Facility_slug_key" ON "Facility"("slug");

-- CreateIndex on slug
CREATE INDEX "Facility_slug_idx" ON "Facility"("slug");

-- AlterTable: Add facilityId to Rebuttal
ALTER TABLE "Rebuttal" ADD COLUMN "facilityId" TEXT;

-- AddForeignKey
ALTER TABLE "Rebuttal" ADD CONSTRAINT "Rebuttal_facilityId_fkey" 
  FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex on facilityId
CREATE INDEX "Rebuttal_facilityId_idx" ON "Rebuttal"("facilityId");
