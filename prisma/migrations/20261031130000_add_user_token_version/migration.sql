-- SOW 11.1a: session revocation. Additive only: one new column with a default.
-- Existing sessions carry no version claim and are treated as version 0, so
-- nobody is logged out by applying this migration.
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

