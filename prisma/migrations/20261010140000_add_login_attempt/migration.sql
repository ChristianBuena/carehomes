-- Login throttling keyed on (email, client IP) instead of the account.
-- Additive only. The per-account columns User.failedLoginAttempts and
-- User.lockedUntil (20261010130000_add_login_lockout) are no longer read or
-- written by the app; they are deliberately left in place.

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastFailedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_email_ipAddress_key" ON "LoginAttempt"("email", "ipAddress");

-- CreateIndex
CREATE INDEX "LoginAttempt_lastFailedAt_idx" ON "LoginAttempt"("lastFailedAt");
