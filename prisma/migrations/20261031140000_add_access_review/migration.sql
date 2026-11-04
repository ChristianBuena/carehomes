-- SOW 11.1: access review history (reviewer, date, decision, notes). Additive only:
-- one new enum, one new table. Existing User.lastReviewedAt values are kept.
-- CreateEnum
CREATE TYPE "AccessReviewDecision" AS ENUM ('KEEP_ACCESS', 'CHANGE_REQUESTED');

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerRole" "Role" NOT NULL,
    "roleAtReview" "Role" NOT NULL,
    "decision" "AccessReviewDecision" NOT NULL DEFAULT 'KEEP_ACCESS',
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessReview_userId_reviewedAt_idx" ON "AccessReview"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "AccessReview_reviewedAt_idx" ON "AccessReview"("reviewedAt");

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

