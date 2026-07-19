-- ── Step 1: Create Organization table ─────────────────────────────────────────
CREATE TABLE "Organization" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Organization_id_idx" ON "Organization"("id");

-- ── Step 2: Add nullable FK columns (no constraint yet) ────────────────────────
ALTER TABLE "User"       ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Facility"   ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "organizationId" TEXT;

-- ── Step 3: Data migration — one org per existing user ─────────────────────────
-- For every existing User, create a personal Organization, wire
-- the Membership to it, and update their Facilities.
DO $$
DECLARE
    u RECORD;
    org_id TEXT;
BEGIN
    FOR u IN SELECT id, name, email FROM "User" LOOP
        -- Generate a unique org id with recognisable prefix
        org_id := 'org_' || replace(gen_random_uuid()::text, '-', '');

        -- Create one Organization per User
        INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
        VALUES (
            org_id,
            COALESCE(NULLIF(u.name, ''), u.email),
            NOW(),
            NOW()
        );

        -- Link User → Organization
        UPDATE "User"
        SET "organizationId" = org_id
        WHERE "id" = u.id;

        -- Link Membership → Organization (was linked to User)
        UPDATE "Membership"
        SET "organizationId" = org_id
        WHERE "userId" = u.id;

        -- Link Facilities → Organization
        UPDATE "Facility"
        SET "organizationId" = org_id
        WHERE "createdById" = u.id;
    END LOOP;
END;
$$;

-- ── Step 4: Add FK constraints now that data is populated ──────────────────────
ALTER TABLE "User"
    ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

ALTER TABLE "Facility"
    ADD CONSTRAINT "Facility_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Facility_organizationId_idx" ON "Facility"("organizationId");

ALTER TABLE "Membership"
    ADD CONSTRAINT "Membership_organizationId_fkey"
    FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Membership_organizationId_key" ON "Membership"("organizationId");

-- ── Step 5: Drop old userId FK from Membership ─────────────────────────────────
-- Drop the old unique index and FK, then remove the column.
DROP INDEX IF EXISTS "Membership_userId_key";
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_userId_fkey";
ALTER TABLE "Membership" DROP COLUMN IF EXISTS "userId";
