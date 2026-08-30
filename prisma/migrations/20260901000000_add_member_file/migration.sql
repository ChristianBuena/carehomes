-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOCX', 'JPG', 'PNG', 'OTHER');

-- CreateTable
CREATE TABLE "MemberFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" "FileType" NOT NULL DEFAULT 'OTHER',
    "mimeType" TEXT NOT NULL,
    "label" TEXT,
    "isQsfDoc" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MemberFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberFile_fileKey_key" ON "MemberFile"("fileKey");
CREATE INDEX "MemberFile_userId_idx" ON "MemberFile"("userId");
CREATE INDEX "MemberFile_userId_uploadedAt_idx" ON "MemberFile"("userId", "uploadedAt");
CREATE INDEX "MemberFile_userId_isQsfDoc_idx" ON "MemberFile"("userId", "isQsfDoc");
CREATE INDEX "MemberFile_deletedAt_idx" ON "MemberFile"("deletedAt");
CREATE INDEX "MemberFile_fileKey_idx" ON "MemberFile"("fileKey");

-- AddForeignKey
ALTER TABLE "MemberFile" ADD CONSTRAINT "MemberFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
