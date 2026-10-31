-- SOW 11.3: keep the signer's name, signing date and visit date out of the published
-- rebuttal text. Additive only: three nullable columns. Existing rows are NOT
-- changed; scripts/list-rebuttals-with-signer-text.ts lists rows whose text
-- still contains those lines (read-only).
-- AlterTable
ALTER TABLE "Rebuttal" ADD COLUMN     "signedOn" DATE,
ADD COLUMN     "signerName" TEXT,
ADD COLUMN     "visitDate" DATE;

