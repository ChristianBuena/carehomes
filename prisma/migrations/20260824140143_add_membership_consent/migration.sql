/*
  Warnings:

  - Made the column `organizationId` on table `Membership` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('REBUTTAL', 'CHECKLIST', 'GUIDE');

-- CreateEnum
CREATE TYPE "TemplateFileFormat" AS ENUM ('PDF', 'DOCX');

-- AlterTable
ALTER TABLE "Membership" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "MembershipAgreement" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "fileFormat" "TemplateFileFormat" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "notionUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "uploadedById" TEXT,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateDownload" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "TemplateDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agreementVersion" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "documentUrl" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipAgreement_version_key" ON "MembershipAgreement"("version");

-- CreateIndex
CREATE INDEX "MembershipAgreement_isActive_idx" ON "MembershipAgreement"("isActive");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_isActive_idx" ON "Template"("isActive");

-- CreateIndex
CREATE INDEX "TemplateDownload_templateId_idx" ON "TemplateDownload"("templateId");

-- CreateIndex
CREATE INDEX "TemplateDownload_userId_idx" ON "TemplateDownload"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE INDEX "ConsentLog_agreementVersion_idx" ON "ConsentLog"("agreementVersion");

-- CreateIndex
CREATE INDEX "ConsentLog_signedAt_idx" ON "ConsentLog"("signedAt");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDownload" ADD CONSTRAINT "TemplateDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateDownload" ADD CONSTRAINT "TemplateDownload_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
