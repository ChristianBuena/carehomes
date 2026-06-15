-- CreateTable
CREATE TABLE "MfaOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MfaOtp_email_idx" ON "MfaOtp"("email");
