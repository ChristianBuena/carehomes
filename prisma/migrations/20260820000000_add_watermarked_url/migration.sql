-- Add watermarkedUrl field to Rebuttal table
ALTER TABLE "Rebuttal" ADD COLUMN "watermarkedUrl" TEXT;

-- Add index for quick lookup of rebuttals with watermarked documents
CREATE INDEX "Rebuttal_watermarkedUrl_idx" ON "Rebuttal"("watermarkedUrl");