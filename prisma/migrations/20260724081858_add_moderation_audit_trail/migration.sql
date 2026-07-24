-- DropIndex
DROP INDEX "Membership_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "Membership_stripeSubscriptionId_idx";

-- AlterTable
ALTER TABLE "Rebuttal" ADD COLUMN     "documentUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CitationDeadline" (
    "id" TEXT NOT NULL,
    "citationId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CitationDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationLog" (
    "id" TEXT NOT NULL,
    "fromStatus" "RebuttalStatus" NOT NULL,
    "toStatus" "RebuttalStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatorId" TEXT NOT NULL,
    "rebuttalId" TEXT NOT NULL,

    CONSTRAINT "ModerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CitationDeadline_userId_idx" ON "CitationDeadline"("userId");

-- CreateIndex
CREATE INDEX "ModerationLog_rebuttalId_idx" ON "ModerationLog"("rebuttalId");

-- CreateIndex
CREATE INDEX "ModerationLog_moderatorId_idx" ON "ModerationLog"("moderatorId");

-- AddForeignKey
ALTER TABLE "CitationDeadline" ADD CONSTRAINT "CitationDeadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationLog" ADD CONSTRAINT "ModerationLog_rebuttalId_fkey" FOREIGN KEY ("rebuttalId") REFERENCES "Rebuttal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
