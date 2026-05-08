/*
  Warnings:

  - The values [PENDING] on the enum `RebuttalStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `description` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `providerType` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `redactionConfirmed` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Rebuttal` table. All the data in the column will be lost.
  - You are about to drop the column `lastAccessReviewAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `mfaEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AccessReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Membership` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModerationAction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PolicyPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PricingPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RebuttalAttachment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdBy` to the `Rebuttal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `Rebuttal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Rebuttal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RebuttalStatus_new" AS ENUM ('SUBMITTED', 'NEEDS_FIX', 'APPROVED', 'REJECTED');
ALTER TABLE "public"."Rebuttal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Rebuttal" ALTER COLUMN "status" TYPE "RebuttalStatus_new" USING ("status"::text::"RebuttalStatus_new");
ALTER TYPE "RebuttalStatus" RENAME TO "RebuttalStatus_old";
ALTER TYPE "RebuttalStatus_new" RENAME TO "RebuttalStatus";
DROP TYPE "public"."RebuttalStatus_old";
ALTER TABLE "Rebuttal" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "AccessReview" DROP CONSTRAINT "AccessReview_reviewedById_fkey";

-- DropForeignKey
ALTER TABLE "AccessReview" DROP CONSTRAINT "AccessReview_reviewedUserId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_planId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_moderatorId_fkey";

-- DropForeignKey
ALTER TABLE "ModerationAction" DROP CONSTRAINT "ModerationAction_rebuttalId_fkey";

-- DropForeignKey
ALTER TABLE "Rebuttal" DROP CONSTRAINT "Rebuttal_userId_fkey";

-- DropForeignKey
ALTER TABLE "RebuttalAttachment" DROP CONSTRAINT "RebuttalAttachment_rebuttalId_fkey";

-- DropIndex
DROP INDEX "Facility_status_idx";

-- DropIndex
DROP INDEX "Rebuttal_userId_idx";

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "description",
DROP COLUMN "providerType",
DROP COLUMN "status",
ADD COLUMN     "ccldLink" TEXT;

-- AlterTable
ALTER TABLE "Rebuttal" DROP COLUMN "approvedAt",
DROP COLUMN "content",
DROP COLUMN "redactionConfirmed",
DROP COLUMN "rejectionReason",
DROP COLUMN "submittedAt",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastAccessReviewAt",
DROP COLUMN "mfaEnabled";

-- DropTable
DROP TABLE "AccessReview";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "Membership";

-- DropTable
DROP TABLE "ModerationAction";

-- DropTable
DROP TABLE "PolicyPage";

-- DropTable
DROP TABLE "PricingPlan";

-- DropTable
DROP TABLE "RebuttalAttachment";

-- DropEnum
DROP TYPE "AccessReviewStatus";

-- DropEnum
DROP TYPE "MembershipStatus";

-- CreateIndex
CREATE INDEX "Facility_name_idx" ON "Facility"("name");

-- CreateIndex
CREATE INDEX "Facility_location_idx" ON "Facility"("location");

-- CreateIndex
CREATE INDEX "Rebuttal_createdBy_idx" ON "Rebuttal"("createdBy");

-- CreateIndex
CREATE INDEX "Rebuttal_reviewedBy_idx" ON "Rebuttal"("reviewedBy");

-- AddForeignKey
ALTER TABLE "Rebuttal" ADD CONSTRAINT "Rebuttal_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rebuttal" ADD CONSTRAINT "Rebuttal_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
