/*
  Warnings:

  - The `plan` column on the `Membership` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Membership` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('NONE', 'TIER_A', 'TIER_B', 'TIER_C');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED');

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "maxFacilities" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "plan",
ADD COLUMN     "plan" "MembershipPlan" NOT NULL DEFAULT 'NONE',
DROP COLUMN "status",
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'INACTIVE';

-- AlterTable
ALTER TABLE "MfaOtp" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "used" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Facility_createdById_idx" ON "Facility"("createdById");

-- CreateIndex
CREATE INDEX "Membership_plan_idx" ON "Membership"("plan");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");
