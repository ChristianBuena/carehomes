-- CreateEnum
CREATE TYPE "ShareLinkExpiry" AS ENUM ('DAYS_7', 'DAYS_30', 'NEVER');

-- CreateTable
CREATE TABLE "FileShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "shareAll" BOOLEAN NOT NULL DEFAULT false,
    "expiry" "ShareLinkExpiry" NOT NULL DEFAULT 'NEVER',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FileShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileShareLinkFile" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "FileShareLinkFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileShareAccessLog" (
    "id" TEXT NOT NULL,
    "shareLinkId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "FileShareAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileShareLink_token_key" ON "FileShareLink"("token");

-- CreateIndex
CREATE INDEX "FileShareLink_token_idx" ON "FileShareLink"("token");

-- CreateIndex
CREATE INDEX "FileShareLink_userId_idx" ON "FileShareLink"("userId");

-- CreateIndex
CREATE INDEX "FileShareLink_userId_createdAt_idx" ON "FileShareLink"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FileShareLink_expiresAt_idx" ON "FileShareLink"("expiresAt");

-- CreateIndex
CREATE INDEX "FileShareLink_revokedAt_idx" ON "FileShareLink"("revokedAt");

-- CreateIndex
CREATE INDEX "FileShareLinkFile_shareLinkId_idx" ON "FileShareLinkFile"("shareLinkId");

-- CreateIndex
CREATE INDEX "FileShareLinkFile_fileId_idx" ON "FileShareLinkFile"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileShareLinkFile_shareLinkId_fileId_key" ON "FileShareLinkFile"("shareLinkId", "fileId");

-- CreateIndex
CREATE INDEX "FileShareAccessLog_shareLinkId_idx" ON "FileShareAccessLog"("shareLinkId");

-- CreateIndex
CREATE INDEX "FileShareAccessLog_shareLinkId_accessedAt_idx" ON "FileShareAccessLog"("shareLinkId", "accessedAt");

-- CreateIndex
CREATE INDEX "FileShareAccessLog_accessedAt_idx" ON "FileShareAccessLog"("accessedAt");

-- AddForeignKey
ALTER TABLE "FileShareLink" ADD CONSTRAINT "FileShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShareLinkFile" ADD CONSTRAINT "FileShareLinkFile_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "FileShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShareLinkFile" ADD CONSTRAINT "FileShareLinkFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MemberFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileShareAccessLog" ADD CONSTRAINT "FileShareAccessLog_shareLinkId_fkey" FOREIGN KEY ("shareLinkId") REFERENCES "FileShareLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
