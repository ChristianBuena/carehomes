# Known Issues

Open bugs, gaps, and things explicitly marked "not found" during this test
pass. See TEST_REPORT.md for how each item below was confirmed and
suggested fixes; this file is the short, scannable version plus anything
that didn't fit there.

## Open bugs (ordered by severity — see TEST_REPORT.md for full detail)

1. **Critical.** `GET /api/admin/access-review` always returns 500 — queries
   a `User.membership` relation that CH-18 removed. The whole
   `/dashboard/moderation/access-review` page is non-functional.
2. **Critical.** `submitRebuttal()` server action has no facility-ownership
   check — any authenticated user can submit a rebuttal for any facility,
   including ones owned by another org or completely unclaimed.
3. **High.** `POST /api/rebuttal` and the facility detail page's claim/CTA
   state check `facility.createdById === user.userId` instead of
   `facility.organizationId === user.orgId` — breaks multi-seat rebuttal
   submission for teammates of the actual claimant.
4. **High.** `GET /api/rebuttal/[id]` has no authentication and no status
   filter — PENDING/REJECTED rebuttal content and the author's name/email
   are readable by anyone who has or guesses the ID.
5. **High.** Facility claim quota check is not transactional — concurrent
   claims one slot below an org's tier limit can both succeed, exceeding the
   limit (reproduced in 13/15 trials).
6. **Medium.** Tier facility limits are duplicated by hand in three files
   (`permissions.ts`, `config/tiers.ts`, `stripe/webhook/route.ts`) with no
   automated check tying them together (beyond the test added in this pass).
7. **Medium.** `claimFacility()`'s quota count is missing a `deletedAt: null`
   filter that `/api/facility`'s equivalent count has — soft-deleted
   facilities count against the quota on one path but not the other.
8. **Medium.** `linkSeatToOrg()` doesn't validate the target `orgId` exists
   up front (generic error instead of a clear one) and doesn't block
   re-linking a user who already belongs to a different org (their prior
   facility claims are left orphaned from any user in that org).
9. **Medium.** Stripe webhook has no `event.id` idempotency tracking —
   database writes are accidentally idempotent (via `upsert`/`updateMany`),
   but notification emails are sent again on every redelivery of the same
   event.
10. **Low.** ADMIN can submit rebuttals via `POST /api/rebuttal` despite that
    route's own comment and error copy claiming otherwise (permissions.ts
    grants ADMIN `submit_rebuttal`); the dashboard UI separately blocks
    ADMIN by role, so the three places that each think they enforce this
    rule don't agree with each other.
11. **Low.** The facility page's "Submit Rebuttal" empty-state CTA is shown
    to any active member regardless of facility ownership (misleading copy,
    not independently exploitable — see TEST_REPORT.md #12).
12. **Low.** No rate limiting/lockout on the login password step (the
    post-password OTP step is well protected; the password check itself is
    not).
13. **Low, code quality.** One remaining `(prisma as any).takedownRequest` in
    `src/app/api/takedown/[id]/route.ts`, against the project's own
    "no `any`" rule.

## Infrastructure / environment issues

14. **RESOLVED during this test pass.** The local dev database (`carehomes`)
    had never been migrated through `prisma migrate` — there was no
    `_prisma_migrations` table, and it was missing every table/column added
    since the 2026-07-24 `add_moderation_audit_trail` migration (12 tables:
    `ModerationLog`, `ArchivedModerationLog`, `Template`, `TemplateDownload`,
    `TakedownRequest`, `ConsentLog`, `MemberFile`, `FileShareLink`,
    `FileShareLinkFile`, `FileShareAccessLog`, `MembershipAgreement`, plus
    columns like `Rebuttal.deletedAt`/`watermarkedUrl`). This was why
    `npm run build` failed locally, and why most of the dashboard would have
    thrown `relation does not exist` if actually used.

    Fixed with the user's approval (baseline + forward-migrate, the
    non-destructive option) as follows:
    1. Full `pg_dump` backup taken first.
    2. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
       computed the exact delta between the live database and the current
       schema — reviewed line by line and confirmed purely additive (new
       enums, new nullable columns, new tables, new indexes/FKs on new
       tables only; zero `DROP`/`DELETE`/`TRUNCATE` statements).
    3. Applied inside a single `BEGIN`/`COMMIT` transaction via `psql`.
    4. Row counts verified identical before and after (User 3, Organization
       3, Membership 3, Facility 20, Rebuttal 4, MfaOtp 1 — unchanged).
    5. All 15 migrations marked as applied via `npx prisma migrate resolve
       --applied <name>`, in order, so `prisma migrate status` now reports
       "Database schema is up to date!" and future `prisma migrate deploy`
       runs will work normally.
    6. Re-ran `npm run build` against the real `carehomes` database —
       exits 0, zero errors.

    The backup dump is at
    `/tmp/claude-1000/-run-media-adrian-hdd-fedora-files-carehomes/db-backup/`
    (session-scoped scratch directory — copy it somewhere durable if you
    want to keep it; it will not survive past this session).

15. **A stale `tsconfig.tsbuildinfo` was present at the start of this
    session** (incremental TypeScript build cache, dated well before recent
    schema changes). It happened not to be masking the Prisma `select` bug
    (finding confirmed on a clean rebuild — see TEST_REPORT.md #10), but a
    stale incremental cache is a general risk; it was deleted during this
    pass and will regenerate fresh on the next `tsc` run.

16. **`npx tsc --noEmit` does not catch invalid Prisma Client `select`/
    `include` field names** in this project's Prisma 7 setup (confirmed by
    direct reproduction — see TEST_REPORT.md #10). This isn't fixable from
    the test suite; it's a property of the generated client types. Treat "the
    build passes" as necessary but not sufficient evidence that Prisma
    queries are valid — only a test that actually hits a real database (as
    this pass's integration suite now does throughout) catches this class of
    bug.

## Minor / cosmetic, not acted on

- Two files at the repo root, `d` and `ent-CH-4`, appear to be accidental
  shell-redirection output (their contents look like `git branch -a` output)
  rather than anything the application uses. Not part of the Next.js app,
  not referenced anywhere in `src/`. Left untouched — flagging for cleanup
  rather than deleting unilaterally, in case they're something in progress.
- The `dotenv` package (v17, a real dependency of this project, not
  something added for testing) prints a random self-promotional "tip" line
  to stdout every time it loads an env file, including in production logs —
  e.g. `injected env (15) from .env.test // tip: ⌁ auth for agents
  [www.vestauth.com]`. This is a known, if controversial, feature of recent
  `dotenv` versions (see `node_modules/dotenv/lib/main.js`), not a security
  issue and not something introduced by this test pass, but worth knowing
  it's there if production log output ever looks unexpectedly chatty.

## Explicitly "not found" / not applicable

- No existing test framework was present before this pass (no Vitest,
  Playwright, or Jest config anywhere in the repo) — confirmed by searching
  for config files; Vitest + Playwright were added per the task's fallback
  instruction.
- No rate-limiting middleware or library (e.g. `express-rate-limit`,
  Upstash ratelimit) exists anywhere in the dependency list or source —
  confirmed by searching `package.json` and `src/`. The only rate limiting
  in the entire app is the OTP resend cooldown and max-attempts counter in
  `src/services/mfa.service.ts`.
- No feature flag / backwards-compatibility shim system exists to check for
  drift against.

See TEST_REPORT.md's "What was not tested, and why" section for the list of
features that were read/documented but not given dedicated automated
coverage in this pass (file sharing, template library, takedown admin
actions beyond intake, PDF watermarking, consent/e-signature flow, and
facility search/filter query building).
