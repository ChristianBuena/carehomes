# Migration Runbook: three pending migrations

Release blocker S-4 (docs/RELEASE_READINESS.md). Nothing in this document has been run against the dev or production database. The migrations were applied and verified on `carehomes_test` only.

## 1. What is pending

These three migrations exist in `prisma/migrations/` and are applied to `carehomes_test`. According to KNOWN_ISSUES.md they are **not** applied to the dev or production databases. Confirm with step 3 below.

| Order | Migration | What it does | Destructive? |
|---|---|---|---|
| 1 | `20261010120000_add_processed_stripe_event` | `CREATE TABLE "ProcessedStripeEvent"` (id, type, processedAt) + index on `processedAt` | No. New table only |
| 2 | `20261010130000_add_login_lockout` | `ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "lockedUntil" TIMESTAMP(3)` | No. Two added columns; one has a default, one is nullable. Existing rows keep their data. On PostgreSQL 11+ adding a column with a constant default does not rewrite the table |
| 3 | `20261010140000_add_login_attempt` | `CREATE TABLE "LoginAttempt"` + unique index on `(email, ipAddress)` + index on `lastFailedAt` | No. New table only |

Checked by reading each `migration.sql` in full. There is **no** `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... TYPE`, `SET NOT NULL` on an existing column, `RENAME`, `DELETE` or `TRUNCATE`. Applying them to a database that already has real users does not change or remove any existing row.

### Why all three are required before deploying this code

- **Login breaks without migration 3.** `POST /api/auth/login` calls `getLoginLock()`, which reads `LoginAttempt` (`src/services/login-throttle.service.ts:30`). Without the table every login returns 500.
- **Most user queries break without migration 2.** The Prisma client knows `User.failedLoginAttempts` and `User.lockedUntil`. Any `prisma.user` query without an explicit `select` (for example the login lookup, `src/app/api/auth/login/route.ts:50-53`) asks for those columns and fails if they are missing.
- **The Stripe webhook breaks without migration 1.** It writes `ProcessedStripeEvent` on every event (`src/app/api/stripe/webhook/route.ts:39`).

So: **apply the migrations first, then deploy the new code.** Applying them early is safe; the old code ignores the new table and columns.

## 2. Before you start

- [ ] Schedule a short window. The migrations themselves take seconds.
- [ ] Have `DATABASE_URL` for the target database available in your shell (never paste it into a ticket or chat).
- [ ] Use the same Prisma CLI version as the app: `npx prisma --version` should show 7.10.1 (after `npm ci`).
- [ ] Make sure nobody else is running migrations at the same time.

## 3. Check the current state (read-only)

```bash
DATABASE_URL="<target>" npx prisma migrate status
```

Expected before applying: the three migrations above are listed as **not yet applied**, and nothing else. **Stop** if:

- it reports a different set of pending migrations;
- it reports a migration as "modified after it was applied" (checksum mismatch);
- it reports that `_prisma_migrations` does not exist. The database was built without `prisma migrate`, as the local dev database once was (KNOWN_ISSUES.md "Infrastructure"). Do **not** run `migrate deploy` on it: migration `20260604125118_add_membership_tiers` drops and re-creates `Membership.plan` / `status` and would reset every plan. Baseline it instead (diff, review, apply the delta, then `prisma migrate resolve --applied` for each migration), as was done for the local dev database.

## 4. Back up

```bash
# Full logical backup, custom format (compressed, restorable with pg_restore)
pg_dump --format=custom --no-owner --file="carehomes-$(date +%Y%m%d-%H%M%S).dump" "<target DATABASE_URL>"

# Prove the backup is readable
pg_restore --list "carehomes-<timestamp>.dump" | head
```

Store the dump somewhere durable and access-controlled (it contains user emails and password hashes). Record row counts so you can compare afterwards:

```sql
SELECT 'User' t, count(*) FROM "User"
UNION ALL SELECT 'Organization', count(*) FROM "Organization"
UNION ALL SELECT 'Membership', count(*) FROM "Membership"
UNION ALL SELECT 'Facility', count(*) FROM "Facility"
UNION ALL SELECT 'Rebuttal', count(*) FROM "Rebuttal";
```

If your host offers point-in-time recovery or snapshots, take a snapshot as well.

## 5. Apply

```bash
DATABASE_URL="<target>" npx prisma migrate deploy
```

`migrate deploy` applies only pending migrations, in order, each in its own transaction, and records them in `_prisma_migrations`. It never resets data and never generates new migrations. (Never use `prisma migrate dev` or `prisma migrate reset` against dev or production.)

Then:

```bash
DATABASE_URL="<target>" npx prisma migrate status   # expect: "Database schema is up to date!"
```

## 6. Verify each migration

Run against the target database.

**Migration 1: `ProcessedStripeEvent`**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ProcessedStripeEvent'
ORDER BY ordinal_position;
-- expect 3 rows: id (text, NO), type (text, NO), processedAt (timestamp without time zone, NO)

SELECT indexname FROM pg_indexes WHERE tablename = 'ProcessedStripeEvent';
-- expect ProcessedStripeEvent_pkey and ProcessedStripeEvent_processedAt_idx
```

**Migration 2: `User` lockout columns**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'User' AND column_name IN ('failedLoginAttempts', 'lockedUntil');
-- expect failedLoginAttempts (integer, NO, default 0) and lockedUntil (timestamp, YES, no default)

SELECT count(*) AS users, count(*) FILTER (WHERE "failedLoginAttempts" <> 0) AS nonzero FROM "User";
-- expect users = the count recorded in step 4; nonzero = 0
```

**Migration 3: `LoginAttempt`**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'LoginAttempt' ORDER BY ordinal_position;
-- expect id, email, ipAddress, failedAttempts, lastFailedAt, lockedUntil

SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'LoginAttempt';
-- expect the pkey, a UNIQUE index on (email, "ipAddress"), and an index on "lastFailedAt"
```

**Nothing else changed:** re-run the row-count query from step 4. Every count must be identical.

**Application check** (after the new code is deployed): sign in once with a real account (password, then the emailed OTP) and open the dashboard. Then confirm a test Stripe webhook delivery shows 200 in the Stripe dashboard (test mode).

## 7. Rollback plan

Prefer **rolling the application back**, not the database. The three migrations only add things, so the previous application version runs fine against the migrated schema. Rolling back the code is enough to undo the release.

Only if the schema itself must be undone (for example a migration failed half-way, which Prisma reports and leaves marked as failed):

1. Roll the application back to the previous version first. The new code needs these tables.
2. Remove what was added, in reverse order:

   ```sql
   BEGIN;
   DROP TABLE IF EXISTS "LoginAttempt";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "lockedUntil", DROP COLUMN IF EXISTS "failedLoginAttempts";
   DROP TABLE IF EXISTS "ProcessedStripeEvent";
   COMMIT;
   ```

   These statements only remove objects the three migrations created. `LoginAttempt` and `ProcessedStripeEvent` hold only throttle counters and processed Stripe event ids; nothing else references them.
3. Tell Prisma the migrations are no longer applied, so a later `migrate deploy` re-applies them:

   ```bash
   DATABASE_URL="<target>" npx prisma migrate resolve --rolled-back 20261010140000_add_login_attempt
   DATABASE_URL="<target>" npx prisma migrate resolve --rolled-back 20261010130000_add_login_lockout
   DATABASE_URL="<target>" npx prisma migrate resolve --rolled-back 20261010120000_add_processed_stripe_event
   ```

4. Last resort: restore the step 4 backup with `pg_restore --clean --if-exists --no-owner -d "<target>" carehomes-<timestamp>.dump`. This loses every write made after the backup, so it is only for real damage.

## 8. Sign-off

| Database | Status checked | Backup taken (file, size) | Deploy run | Verification passed | By / date |
|---|---|---|---|---|---|
| dev (`carehomes`) | | | | | |
| production | | | | | |

---

# Part 2: SOW code-gap migrations (branch `sow-code-gaps`, 2026-10-31)

Five more migrations, written on branch `sow-code-gaps` and applied to `carehomes_test` only. Nothing here has been run against the dev or production database. Apply Part 1 first if it is still pending; `npx prisma migrate deploy` applies everything pending, in order.

## P2.1 What is pending

| Order | Migration | What it does | Destructive? |
|---|---|---|---|
| 4 | `20261031120000_add_audit_log` | `CREATE TABLE "AuditLog"` + 4 indexes; a function `audit_log_reject_change()`; triggers that reject `UPDATE`, `DELETE` and `TRUNCATE` on `"AuditLog"` | **No** for existing data (new table only). **Operational note, see P2.3** |
| 5 | `20261031130000_add_user_token_version` | `ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0` | No. Constant default, no table rewrite on PostgreSQL 11+. Existing sessions count as version 0, so **nobody is logged out** by applying it |
| 6 | `20261031140000_add_access_review` | `CREATE TYPE "AccessReviewDecision"`; `CREATE TABLE "AccessReview"` + 2 indexes + 2 foreign keys to `"User"` | No. New type and table. `lastReviewedAt` values are kept |
| 7 | `20261031150000_add_rebuttal_private_signer` | `ALTER TABLE "Rebuttal" ADD COLUMN "signerName" TEXT, "signedOn" DATE, "visitDate" DATE` | No. Three nullable columns. Existing rebuttal text is **not** changed (see P2.4) |
| 8 | `20261031160000_add_rebuttal_watermark_status` | `CREATE TYPE "WatermarkStatus"`; `ALTER TABLE "Rebuttal" ADD COLUMN "watermarkStatus", "watermarkError", "watermarkUpdatedAt"` | No. One type, three nullable columns |

Checked by reading each `migration.sql` in full: no `DROP`, no `ALTER COLUMN ... TYPE`, no `SET NOT NULL` on an existing column, no `RENAME`, no `DELETE`, no `UPDATE`, no `TRUNCATE`. **Nothing destructive.**

### Why they are required before deploying this code

- Migration 5: every authenticated request reads `User.tokenVersion` (`src/lib/auth.ts`). Without the column, **every login-protected page and API returns 401/500**.
- Migration 4: every audited action inserts into `AuditLog`. Writes are wrapped so the user's request still succeeds, but nothing is recorded and the error log fills up.
- Migrations 6, 7, 8: the access review, rebuttal submission and moderation queries select these columns and fail without them.

So, as in Part 1: **apply the migrations, then deploy.** The previous application version ignores the new tables and columns, so applying early is safe.

## P2.2 Steps

Same as Part 1 sections 2 to 5 (`migrate status`, `pg_dump` backup with row counts, `migrate deploy`, `migrate status`). Expected pending list: the five migrations above (plus Part 1's three if those were not applied yet).

## P2.3 The audit log is append-only: what that means for operators

- The application role can only `INSERT` into `"AuditLog"`. `UPDATE`, `DELETE` and `TRUNCATE` raise `AuditLog is append-only` (SQLSTATE 42501), for every role, including the table owner.
- `DROP TABLE` is **not** blocked (triggers cannot block it). A full restore with `pg_restore --clean` therefore still works.
- Tools that empty tables with `TRUNCATE` (some seed or reset scripts) fail on this table. Never run them against dev or production anyway.
- If a row must ever be removed (court order, mistaken personal data), the database owner has to do it deliberately:
  ```sql
  BEGIN;
  ALTER TABLE "AuditLog" DISABLE TRIGGER "audit_log_no_update_delete";
  DELETE FROM "AuditLog" WHERE id = '<id>';
  ALTER TABLE "AuditLog" ENABLE TRIGGER "audit_log_no_update_delete";
  COMMIT;
  ```
  Record who did it and why, outside the database.
- The table grows without limit. There is no retention job yet (`docs/policies/data-retention-policy.md` needs a period from counsel).

## P2.4 Data the migrations deliberately do NOT change (your decision)

1. **Rebuttals whose text already contains the signer's name or visit date.** List them (read-only, prints ids and status only, never the text):
   ```bash
   DATABASE_URL="<target>" npx tsx scripts/list-rebuttals-with-signer-text.ts
   ```
   For each APPROVED one, decide whether to edit the text or unpublish it. The script changes nothing.
2. **Share links that never expire.** New links must expire within 30 days; existing ones are untouched. List them:
   ```sql
   SELECT id, "userId", "createdAt", "shareAll"
   FROM "FileShareLink"
   WHERE "revokedAt" IS NULL AND "expiresAt" IS NULL
   ORDER BY "createdAt";
   ```
   To end them all at once (this IS a data change, so only if you decide to):
   ```sql
   UPDATE "FileShareLink" SET "revokedAt" = now() WHERE "revokedAt" IS NULL AND "expiresAt" IS NULL;
   ```
3. **Approved rebuttals with no approved copy.** Only new approvals make one automatically. Existing approved rebuttals keep `watermarkStatus = NULL`; a moderator can make the copy with `POST /api/rebuttal/<id>/approved-copy`.

## P2.5 Verify

```sql
-- 4: table and the two triggers
SELECT tgname FROM pg_trigger WHERE tgrelid = '"AuditLog"'::regclass AND NOT tgisinternal;
-- expect audit_log_no_update_delete, audit_log_no_truncate
BEGIN; DELETE FROM "AuditLog"; ROLLBACK;  -- expect: ERROR  AuditLog is append-only: DELETE is not allowed

-- 5
SELECT count(*) AS users, count(*) FILTER (WHERE "tokenVersion" <> 0) AS nonzero FROM "User";
-- expect users = the step 4 count; nonzero = 0

-- 6, 7, 8
SELECT to_regclass('"AccessReview"') IS NOT NULL AS access_review;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Rebuttal' AND column_name IN ('signerName','signedOn','visitDate','watermarkStatus','watermarkError','watermarkUpdatedAt');
-- expect 6 rows
```

Re-run the row-count query from Part 1 step 4: every count must be identical.

Application check after deploy: sign in (password + OTP), open the dashboard, sign out, and confirm the old cookie no longer works (reload a dashboard page: you should land on /login). As an ADMIN, open `/dashboard/reports` and download the audit log CSV: your sign-in and sign-out should be in it.

## P2.6 Rollback

Roll the application back first; the previous version runs against the migrated schema. Only if the schema itself must be undone, in reverse order:

```sql
BEGIN;
ALTER TABLE "Rebuttal" DROP COLUMN IF EXISTS "watermarkUpdatedAt", DROP COLUMN IF EXISTS "watermarkError", DROP COLUMN IF EXISTS "watermarkStatus";
DROP TYPE IF EXISTS "WatermarkStatus";
ALTER TABLE "Rebuttal" DROP COLUMN IF EXISTS "visitDate", DROP COLUMN IF EXISTS "signedOn", DROP COLUMN IF EXISTS "signerName";
DROP TABLE IF EXISTS "AccessReview";
DROP TYPE IF EXISTS "AccessReviewDecision";
ALTER TABLE "User" DROP COLUMN IF EXISTS "tokenVersion";
DROP TABLE IF EXISTS "AuditLog";
DROP FUNCTION IF EXISTS "audit_log_reject_change"();
COMMIT;
```

**Warning:** dropping these loses data written since the deploy: the audit log, access-review records, and the private signer details of new rebuttals (which are not in the text any more). Export the audit log and access reviews (CSV, from `/dashboard/reports` and the access review page) before you do this. Then mark each migration rolled back with `npx prisma migrate resolve --rolled-back <name>`, newest first.

## P2.7 Settings you must change outside the code (UploadThing, Cloudinary)

The code no longer hands out storage URLs and fetches files with signed URLs. These settings close the remaining gap: files uploaded **before** this change have public URLs that may already have been seen.

**UploadThing (member files)**
1. In the UploadThing dashboard for this app, enable private files / ACL override (Settings, "Regions and ACL").
2. Then set `UPLOADTHING_PRIVATE_FILES=true` in the production environment and redeploy. New uploads are then private. Do not set it before step 1: UploadThing rejects uploads that ask for an ACL the app does not allow.
3. Make existing files private: `UTApi.updateACL(<keys>, "private")` for every `MemberFile.fileKey`, or the equivalent dashboard action. After that, old public `ufsUrl` links stop working; the app keeps working because it signs every download.
4. Confirm the dashboard shows the files as private, and that a stored `MemberFile.fileUrl` opened in a private browser window is refused.

**Cloudinary (rebuttal documents)**
1. New uploads are type `authenticated` (not reachable by URL). Nothing to change for them.
2. Older documents were uploaded as type `upload` (public). Either convert each one (Admin API `update` with `type: "authenticated"`, or re-upload) or delete those that should never have been public. Prioritise the ones attached to rebuttals approved before PR #38: their URLs were shown on public pages.
3. Settings, Security: turn on "Strict transformations" so nobody can request derived versions of stored files.
4. Settings, Security: check "PDF and ZIP files delivery". The app fetches PDFs server-side with signed URLs; if your account blocks PDF delivery, enable it (signed delivery only).
5. Confirm: a stored `Rebuttal.documentUrl` opened in a private browser window is refused.
