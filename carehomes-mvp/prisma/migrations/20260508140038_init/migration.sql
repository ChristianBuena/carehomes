/*
  Warnings:

  - You are about to drop the column `endDate` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `nextBillingDate` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Membership` table. All the data in the column will be lost.
  - The `status` column on the `Membership` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RebuttalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_FIX');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccessReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "endDate",
DROP COLUMN "nextBillingDate",
DROP COLUMN "plan",
DROP COLUMN "startDate",
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN     "planId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'INACTIVE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastAccessReviewAt" TIMESTAMP(3),
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rebuttal" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RebuttalStatus" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "redactionConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Rebuttal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebuttalAttachment" (
    "id" TEXT NOT NULL,
    "rebuttalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RebuttalAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "rebuttalId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewedUserId" TEXT NOT NULL,
    "status" "AccessReviewStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_status_idx" ON "Facility"("status");

-- CreateIndex
CREATE INDEX "Rebuttal_facilityId_idx" ON "Rebuttal"("facilityId");

-- CreateIndex
CREATE INDEX "Rebuttal_userId_idx" ON "Rebuttal"("userId");

-- CreateIndex
CREATE INDEX "Rebuttal_status_idx" ON "Rebuttal"("status");

-- CreateIndex
CREATE INDEX "RebuttalAttachment_rebuttalId_idx" ON "RebuttalAttachment"("rebuttalId");

-- CreateIndex
CREATE INDEX "ModerationAction_rebuttalId_idx" ON "ModerationAction"("rebuttalId");

-- CreateIndex
CREATE INDEX "ModerationAction_moderatorId_idx" ON "ModerationAction"("moderatorId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_name_key" ON "PricingPlan"("name");

-- CreateIndex
CREATE INDEX "PricingPlan_stripePriceId_idx" ON "PricingPlan"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyPage_slug_key" ON "PolicyPage"("slug");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AccessReview_reviewedUserId_idx" ON "AccessReview"("reviewedUserId");

-- CreateIndex
CREATE INDEX "AccessReview_reviewedById_idx" ON "AccessReview"("reviewedById");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_stripeCustomerId_idx" ON "Membership"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rebuttal" ADD CONSTRAINT "Rebuttal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rebuttal" ADD CONSTRAINT "Rebuttal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebuttalAttachment" ADD CONSTRAINT "RebuttalAttachment_rebuttalId_fkey" FOREIGN KEY ("rebuttalId") REFERENCES "Rebuttal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_rebuttalId_fkey" FOREIGN KEY ("rebuttalId") REFERENCES "Rebuttal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_reviewedUserId_fkey" FOREIGN KEY ("reviewedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
