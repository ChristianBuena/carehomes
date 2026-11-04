-- SOW 11.2: record whether the approved copy ("PUBLIC REDACTED VERSION") was made.
-- Additive only: one new enum and three nullable columns. Existing rows stay NULL.
-- CreateEnum
CREATE TYPE "WatermarkStatus" AS ENUM ('APPLIED', 'FAILED');

-- AlterTable
ALTER TABLE "Rebuttal" ADD COLUMN     "watermarkError" TEXT,
ADD COLUMN     "watermarkStatus" "WatermarkStatus",
ADD COLUMN     "watermarkUpdatedAt" TIMESTAMP(3);

