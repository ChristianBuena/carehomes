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
