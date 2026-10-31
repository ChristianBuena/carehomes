# Release Readiness

Audit date: 2026-10-31
Audited code: branch `round-3-cleanup-and-skipped-areas` at commit `41d027f`, working tree clean, nothing committed or pushed.
Databases: every command that touches a database ran against `carehomes_test` only (`.env.test`; the `migrate status` output names the database "carehomes_test" at localhost:5432). The dev (`carehomes`) and production databases were not touched. Stripe, email and UploadThing were not called (the test suite mocks them; `.env.test` holds dummy keys, which differ from the dev values).
Companion file: `docs/SOW_GAP_ANALYSIS.md`.

## Final verdict: NO-GO

The release candidate publishes the original, un-watermarked rebuttal documents on public facility pages and through a public API. Public endpoints return user email addresses. The Next.js version has published critical vulnerabilities. The SOW's own security section is not met (no "FOR ATTORNEY REVIEW ONLY" watermark, no ethics/supervision policy), and the build does not match the SOW tool stack, with no change order. Fix the Critical and High items below, merge or drop the unmerged work, and sign a change order before asking for sign-off.

## Blockers, ranked

Severity rule: anything that could expose client data, break login, or contradict SOW Section 11 is at the top.

| ID | Severity | Blocker | Evidence | Fix | Effort |
|---|---|---|---|---|---|
| S-1 | Critical | **Original (un-watermarked) rebuttal documents are public.** Two paths: (a) the public facility page links each approved rebuttal's `documentUrl`; (b) `GET /api/rebuttal/published` (no auth) returns full rebuttal rows including `documentUrl`. This is the member's raw upload, which may still contain resident PHI if redaction was missed. Path (a) is **not** listed in KNOWN_ISSUES.md, which only names the API (D-1) | (a) `src/app/(public)/facilities/[slug]/page.tsx:143` maps `filesUrl: r.documentUrl`, rendered as links at `src/components/facilities/ApprovedRebuttalsSection.tsx:58-60` and `103-106`; the query selects `documentUrl` at `src/services/rebuttal.service.ts:58`. (b) `src/app/api/rebuttal/published/route.ts:6-23` (no `select`). Pinned by `tests/integration/watermark.test.ts:277` (`it.fails`) | Select only `watermarkedUrl` for public reads; show no document until a watermarked copy exists; never expose `documentUrl` publicly. Fix the watermark pipeline first (S-6) | Medium |
| S-2 | Critical | **User emails are public.** `GET /api/facility` (no auth) returns `createdBy.email` for every claimed facility; `GET /api/rebuttal/published` returns each author's email | `src/services/facility.service.ts:164` (used by `src/app/api/facility/route.ts:10-14`); `src/app/api/rebuttal/published/route.ts:12-17`. Pinned by `tests/integration/watermark.test.ts:284` (`it.fails`) | Remove `email` (and `id`) from both public selects | Small |
| S-3 | Critical | **Next.js 16.2.6 has critical and high advisories**, including unauthenticated RCE in the Image Optimization API (GHSA-2464-fhr4-w9xw, affects up to and including 16.4.0) and a middleware bypass (GHSA-6gpp-xcg3-4w24). | `npm audit --omit=dev`; `npm ls next` shows 16.2.6 | Upgrade `next` (and `eslint-config-next`, `@next/*`) to the first release npm reports as fixing all listed advisories. Re-run the full suite | Small to Medium |
| S-4 | Critical | **Login breaks on any database missing the three new migrations.** The login route queries `LoginAttempt`, which only exists after `20261010140000_add_login_attempt`. KNOWN_ISSUES.md says these were applied to `carehomes_test` only | `src/app/api/auth/login/route.ts:45` (`getLoginLock`); `src/services/login-throttle.service.ts:65`. Dev and prod state not checked (forbidden by audit rules) | Back up, then `npx prisma migrate deploy` on dev and prod: `20261010120000_add_processed_stripe_event`, `20261010130000_add_login_lockout`, `20261010140000_add_login_attempt`. All three are additive (see Data and migrations) | Small |
| S-5 | High | **Secrets were committed to git history and pushed.** `.env` (key names `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`) in commits `c55dfb2` and `b09f8fc` (reachable from `origin/merge/frontend-backend-unwired`); `carehomes-support-docs/.env` (`DATABASE_URL`, `JWT_SECRET`) in `fb6d8f7`. The historical `JWT_SECRET` and `EMAIL_PASS` differ from today's dev `.env`; `EMAIL_USER` and `DATABASE_URL` match (compared by hash, values not printed). Production values could not be checked | `git log --all -- .env carehomes-support-docs/.env` | Confirm the production `JWT_SECRET`, Gmail app password and database password were never one of those values; rotate anything that was. Consider purging history | Small |
| S-6 | High | **SOW 11.2 watermark not implemented.** The only watermark text is "PUBLIC REDACTED VERSION". It never runs (no caller of `POST /api/rebuttal/watermark`; not wired to approval on this branch). The text check rejects normal compressed PDFs (D-3) and accepts scanned ones (D-4) | `src/services/pdf-watermark.service.ts:14` and `:46-47`; `tests/integration/watermark.test.ts:373,381` (`it.fails`). A fix exists on unmerged `origin/CH-48-fix-public-data-leaks` (3 commits), not reviewed as part of this release | Decide the wording with the client (change order CO-4). Merge and review CH-48, add a "FOR ATTORNEY REVIEW ONLY" mark for drafts, store output in object storage, not base64 in the row (D-6) | Medium |
| S-7 | High | **Seed script creates an ADMIN with a hard-coded password** and has no production guard. If it was ever run against production, that admin account is open | `prisma/seed.ts:41` (`Admin@123456`), `:94-104` (admin upsert), `:512-513` prints the credentials; `package.json` `db:seed`; `docs/README.md:86` tells people to run it | Refuse to run when `NODE_ENV=production`; generate a random password; check production for the seeded admin email and delete or reset it | Small |
| S-8 | High | **SOW scope mismatch with no change order.** The build is a custom app; the SOW describes Notion/Forms/Airtable/Calendly/SignWell/Drive. SOW 13 requires a written change order | `docs/SOW_GAP_ANALYSIS.md` Part 2 | Sign change orders CO-1 to CO-5 before requesting sign-off | Medium (contract work) |
| S-9 | High | **Intake and e-signature do not exist.** Milestones 4 to 6, acceptance criterion 9.2 and KPI 12.1 depend on intake | No intake route, page or model; `ConsentLog`/`MembershipAgreement` are never written (`grep consentLog.create src`: none). Signing flow only on unmerged `origin/CH-40-electronics-consent` | Merge CH-40 after review, or provide the external tool links and record that in the change order | Medium to Large |
| S-10 | High | **Policies are drafts.** Privacy and Terms say "DRAFT, subject to attorney review before launch"; no ethics/supervision (ABA MR 5.3) policy; no conflicts protocol | `src/app/(public)/privacy/page.tsx:10,52,61,78,83`; `terms/page.tsx:87`; `git grep "5\.3\|Model Rule"` on all branches: none | Write the missing policies; get client and counsel approval (SOW 9.3) | Medium |
| S-11 | Medium | Share link with an unrecognised expiry value silently never expires (A-1) | `src/app/api/files/share/route.ts:10-25`; `tests/integration/files.test.ts:407` (`it.fails`) | Validate `expiry` with Zod; reject unknown values | Small |
| S-12 | Medium | Stored files are reachable without login by anyone holding the storage URL. Revoking a share link does not revoke URLs already handed out | Cloudinary upload with default delivery (`src/app/actions/rebuttals.ts:29-30`); UploadThing `ufsUrl` stored and returned (`src/lib/uploadthing.ts:44`; `src/app/api/share/[token]/route.ts:85-89`) | Use private or authenticated delivery and serve files through a signed, short-lived proxy route | Medium |
| S-13 | Medium | No security headers (CSP, HSTS, X-Frame-Options or frame-ancestors, Referrer-Policy) | `next.config.ts` has no `headers()`; no other header config found | Add `headers()` in `next.config.ts` | Small |
| S-14 | Medium | Quarterly access review is broken for MODERATORs and records no reviewer. Middleware blocks `/api/admin/*` for anyone without `manage_users`, but the route and page are meant for moderators. Tests call the handler directly, so they miss it | `src/middleware.ts:47-53` versus `src/app/api/admin/access-review/route.ts:23,82`; `lastReviewedAt` only (`:97`) | Decide who reviews; align middleware and route; store reviewer id, decision and notes | Small |
| S-15 | Medium | Sessions cannot be revoked. Logout clears the cookie only; the JWT stays valid for 7 days, and the role inside it can be up to 7 days stale | `src/lib/jwt.ts:30-35`; `src/app/api/auth/logout/route.ts:9`; KNOWN_ISSUES "Open, other" 4 | Add a session version or denylist; shorten token life | Medium |
| S-16 | Medium | No audit log for login, claims, billing changes, role changes or file actions (SOW 3E) | `docs/SOW_GAP_ANALYSIS.md` "3E audit trail" table | Add an `AuditLog` model and write to it from those paths | Medium |
| S-17 | Medium | 24 high and 3 critical npm advisories in production dependencies. Beyond `next`: `next-auth` (critical, **installed but not used anywhere in `src`**), `proxy-addr` (critical, via `uploadthing` > `express`), `nodemailer` (high, fix needs major 10.x), `axios`, `zod`, `uploadthing`, `sharp` and others | `npm audit --omit=dev` | Remove `next-auth`; run `npm audit fix`; plan the major upgrades | Medium |
| S-18 | Medium | Lint cannot run. ESLint 10 crashes loading `eslint-plugin-react` from `eslint-config-next` | `npm run lint` exit 2: `TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function` | Pin ESLint 9 or upgrade `eslint-config-next` to a version that supports ESLint 10 | Small |
| S-19 | Medium | Production-build E2E fails intermittently: rebuttal form fields rendered twice (4 of 8 executions over two runs; 0 failures on the dev server) | Playwright production runs; `tests/e2e/action-errors.spec.ts:48,71,86` | Reproduce in a production build in a browser; find the source of the duplicate form; fix before release | Small to Medium |
| S-20 | Medium | No deploy guide, rollback plan, backup procedure or stabilization runbook. Root `README.md` is the create-next-app boilerplate. No `.env.example`. `UPLOADTHING_TOKEN` (needed by `uploadthing`) is not in any env file or doc | `README.md`; `ls -a` (no `.env.example`); `grep UPLOADTHING .env*`: 0 | Write them (see Operations) | Medium |
| S-21 | Medium | Google Analytics loads for every visitor with no consent banner | `src/app/layout.tsx:29-30`; no consent component found | Add consent, or disable GA until the privacy notice is final | Small |
| S-22 | Medium | The print rebuttal form writes the signer's name and visit date into the rebuttal body, which is published on approval. Drafts are kept in browser `localStorage` | `src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx:86`; `localStorage` key `rebuttal_form_draft` | Store signer separately and keep it private; clear or avoid local drafts | Small |
| S-23 | Medium | Docker setup: Postgres password hard-coded and port 5432 published to the host; secrets passed as build `ARG`/`ENV` (stored in builder image layers) | `docker-compose.yml` (`POSTGRES_PASSWORD`, `ports: "5432:5432"`); `Dockerfile` lines 8-28 | Use runtime env or secrets only; do not publish the DB port | Small |
| S-24 | Low | OTP codes stored in plain text | `src/services/mfa.service.ts:118-121` (`code: otp`) | Store a hash; compare hashes | Small |
| S-25 | Low | Emails written to server logs; leftover debug log | `src/lib/mailer.ts:33`; `src/services/mfa.service.ts:137`; `src/app/api/moderation/route.ts:221`; `src/app/api/auth/signup/route.ts:6` ("SIGNUP API HIT") | Remove or redact | Small |
| S-26 | Low | Middleware redirects to `/unauthorized`, which does not exist (404) | `src/middleware.ts:42,59`; no `src/app/unauthorized` | Add the page or redirect to `/dashboard` | Small |
| S-27 | Low | Open low-severity defects from round 3: A-2/D-8, A-3/A-5, A-4, A-6, B-1, D-7, F-1 | `docs/KNOWN_ISSUES.md`; matching `it.fails` tests | Fix in stabilization | Small each |
| S-28 | Low | No `robots.txt` or sitemap | No `src/app/robots.*`, `src/app/sitemap.*` or `public/robots.txt` | Add both | Small |

## Part 2: Release readiness checklist

### Build and quality

| Check | Command | Result |
|---|---|---|
| Prisma schema | `npx dotenv -e .env.test -- npx prisma validate` | Exit 0. "The schema at prisma/schema.prisma is valid" |
| Migration status (test DB only) | `npx dotenv -e .env.test -- npx prisma migrate status` | Exit 0. Database "carehomes_test". "18 migrations found", "Database schema is up to date!" |
| Pending migrations for dev and prod | From `docs/KNOWN_ISSUES.md` "Open, other" 1; not checked live | `20261010120000_add_processed_stripe_event`, `20261010130000_add_login_lockout`, `20261010140000_add_login_attempt`. Must be applied before release (S-4) |
| TypeScript | `npx tsc --noEmit` | Exit 0, no errors. Caveat from TEST_REPORT #10: tsc does not catch invalid Prisma `select` keys |
| Lint | `npm run lint` | **Exit 2. ESLint crashes** before reporting (S-18). Lint status unknown |
| Build | `npx dotenv -e .env.test -- npm run build` | Exit 0. Next.js 16.2.6 (Turbopack). Warnings: "middleware file convention is deprecated, use proxy"; repeated "Auth error: Dynamic server usage" log lines from `getUserFromRequest()` during static generation (noise; those routes render dynamically) |
| Vitest | `npm test` | Exit 0. **17 files; 486 tests: 471 passed, 15 expected-fail (`it.fails`), 0 failed, 0 skipped.** Matches TEST_REPORT.md |
| Playwright, dev server | `npm run test:e2e` | First run: exit 1, "Timed out waiting 60000ms from config.webServer" (dev server too slow to start on this disk; no test ran). Retry: see below |
| Playwright, production build | `npm run test:e2e:prod` | **Exit 1. 4 tests: 2 passed, 2 failed.** Both failures in `tests/e2e/action-errors.spec.ts:48` and `:71`: "strict mode violation: locator('select[name=facilityId]') resolved to 2 elements" on `/dashboard/rebuttals/new`. The post-failure accessibility snapshot shows one select, so this may be a transient double render rather than a page bug. Not confirmed either way. TEST_REPORT.md claims 4/4 |

| Playwright, dev server (retry) | Same specs, temporary config in the session scratch directory that only raises the webServer start timeout to 10 minutes (repo files unchanged) | **Exit 0. 18 tests: 17 passed, 1 expected-fail (`share-page.spec.ts:74`, A-6), 0 failed, 0 skipped.** Matches TEST_REPORT.md |
| Playwright, production build (retry) | Same, timeout raised to 15 minutes | **Exit 1 again. 4 tests: 2 passed, 2 failed**, this time `action-errors.spec.ts:48` and `:86`. Errors: "strict mode violation: `select[name=facilityId]` resolved to 2 elements" and "`input[name=redactionAcknowledged]` resolved to 2 elements" |

**E2E conclusion:** across two production-build runs, 4 of 8 test executions failed. Every failure is the same symptom: the rebuttal form's fields appear twice in the DOM on `/dashboard/rebuttals/new` and `/dashboard/rebuttals/[id]/edit`. This never happened on the dev server (18/18). Which test fails changes between runs, so it is timing-dependent. The cause was not determined in this audit (no code changes allowed). It could be a real production double render that users would see, or a test-timing artifact. TEST_REPORT.md's "4/4 on a production build" could not be reproduced. Treat as S-19 until explained.

**Tests marked expected-fail (`it.fails` / `test.fail()`), each an open defect:**

| File:line | Severity | Defect |
|---|---|---|
| `tests/integration/watermark.test.ts:277` | High | Original un-watermarked document available publicly (D-1) |
| `tests/integration/watermark.test.ts:373` | High | Normal text PDF rejected as "scanned" (D-3) |
| `tests/integration/watermark.test.ts:120` | Medium | Watermark has no user or org information (D-5) |
| `tests/integration/watermark.test.ts:284` | Medium | Public published list exposes author email (D-2) |
| `tests/integration/watermark.test.ts:381` | Medium | Scanned PDF accepted (D-4) |
| `tests/integration/watermark.test.ts:431` | Medium | No size limit on watermarking (D-6) |
| `tests/integration/files.test.ts:407` | Medium | Unknown expiry creates never-expiring link (A-1) |
| `tests/integration/watermark.test.ts:211` | Low | Garbage token gets 500 not 401 (D-8) |
| `tests/integration/watermark.test.ts:334` | Low | Corrupt PDF told it is "scanned" (D-7) |
| `tests/integration/files.test.ts:290` | Low | Non-string label gets 500 (A-3) |
| `tests/integration/files.test.ts:297` | Low | Garbage token gets 500 on file routes (A-2) |
| `tests/integration/files.test.ts:421` | Low | Duplicate file ids get misleading 403 (A-4) |
| `tests/integration/files.test.ts:427` | Low | Malformed fileIds gets 500 (A-5) |
| `tests/integration/templates.test.ts:315` | Low | Template `fileUrl` accepts `javascript:` (B-1) |
| `tests/integration/uploadthing.test.ts:113` | Low | Upload accepted for a deleted user's token (F-1) |
| `tests/e2e/share-page.spec.ts:75` (`test.fail()`) | Low | `/share/<unknown>` returns HTTP 200 (A-6) |

No `.skip`, `.todo` or `.only` found (`grep -rnE "(it|test|describe)\.(skip|todo|only)" tests`: none).

### Security

| Check | Result | Evidence |
|---|---|---|
| `npm audit --omit=dev` | **42 vulnerabilities: 3 critical, 24 high, 10 moderate, 5 low.** Critical: `next` (direct), `next-auth` (direct, unused), `proxy-addr` (transitive via `uploadthing` > `express`). High includes `nodemailer`, `axios`, `zod`, `uploadthing`, `@uploadthing/react`, `prisma`, `shadcn`, `sharp`, `postcss`, `form-data`, `follow-redirects` and others | S-3, S-17 |
| Committed secrets, working tree | No `.env*`, key or backup file is tracked (`git ls-files` shows none). `.gitignore` covers `.env*`. Hard-coded: Postgres password in `docker-compose.yml`; seed admin password in `prisma/seed.ts` | S-7, S-23 |
| Committed secrets, history | `.env` in `c55dfb2`, `b09f8fc`; `carehomes-support-docs/.env` in `fb6d8f7`. Removed later (`246a00c` "chore: remove .env from tracking") but still in history and on `origin` | S-5 |
| `.env.example` lists every variable | **No `.env.example` exists.** Variables the code reads (`grep process.env`): `DATABASE_URL`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_A`, `STRIPE_PRICE_B`, `STRIPE_PRICE_C`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_NOTION_KB_URL`, `NODE_ENV`, `ANALYZE`. Also required but read by a library: `UPLOADTHING_TOKEN` (in no env file). `docs/README.md:58-73` lists 13 of these and omits GA, Notion and UploadThing | S-20 |
| Auth cookie flags | `auth-token`: `httpOnly: true`, `secure` in production, `sameSite: "lax"`, `path: "/"`, 7 days (`src/app/api/auth/verify/route.ts:83-89`). `mfa-pending`: `httpOnly`, `secure` in production, `sameSite: "strict"`, `path: "/api"`, 10 minutes (`login/route.ts:88-94`). Acceptable | |
| JWT secret handling | Read from `JWT_SECRET`; startup throws if missing (`src/lib/jwt.ts:3-7`); HS256; MFA-pending tokens rejected as sessions (`:44`). No minimum-length check. No revocation | S-15 |
| No route returns password hashes | Verified: every `prisma.user` read that reaches a response uses `select` without `password`. The login route loads the full row but returns only the email (`login/route.ts:50-85`). `takedown.service.ts:398` loads `user: true` but does not return it. Round 2 fixed the facility detail leak (`facility.service.ts:241` comment) | |
| KNOWN_ISSUES D-1 (published route returns originals) | **Still present.** `src/app/api/rebuttal/published/route.ts:6-23` | S-1 |
| Public facility list returns user emails | **Still present.** `src/services/facility.service.ts:164` | S-2 |
| PDF text-detection bug (D-3) | **Still present.** `src/services/pdf-watermark.service.ts:46-47` checks for the bytes "BT" and "ET" in the raw file | S-6 |
| Login lockout documented | Yes. 5 failures per (email, client IP), 15-minute lock (`src/services/login-throttle.service.ts:9-12`); documented in `docs/KNOWN_ISSUES.md` "Open, other" 3 and TEST_REPORT.md round 3 "Item 3, trade-offs" | |
| Forwarded-IP assumption documented | Yes. `src/lib/client-ip.ts:1-11` comment, `KNOWN_ISSUES.md` "Open, other" 3. The proxy must overwrite `X-Forwarded-For`. Whoever deploys must confirm this for the real host; not checkable here | |

### Configuration and operations

| Check | Result | Evidence |
|---|---|---|
| Stripe keys from env | Yes. `src/lib/stripe.ts:3` (`STRIPE_SECRET_KEY`); price ids from `STRIPE_PRICE_A/B/C` | |
| Webhook verifies signature | Yes. `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` (`src/app/api/stripe/webhook/route.ts:57-66`); 400 without a signature (`:51-53`). Event dedup via `ProcessedStripeEvent` (`:39`) | |
| Test or live mode set only by env | Yes. No hard-coded keys or mode flags found. All three local env files hold `sk_test` keys (prefix only checked). Production must set live keys and a live webhook secret | |
| Email and OTP configured by env | Yes. Gmail SMTP with `EMAIL_USER`/`EMAIL_PASS` (`src/lib/mailer.ts:3-9`). OTP from `crypto.randomInt` (`mfa.service.ts:81-82`). No bypass code and no hard-coded test recipient in the send path. Note: a personal Gmail account has daily send limits, an operational risk at launch | |
| Debug code, sensitive logging | Emails logged in 3 places plus one debug line (S-25). No passwords, tokens or OTP codes logged (checked every `console.log` in `src`) | |
| Seed data, test accounts, hard-coded admin | Seed creates `carehomessupport444@gmail.com` (ADMIN), `member@carehomesdocs.org`, `free@carehomesdocs.org` with fixed passwords, no environment guard | S-7 |
| Stack traces to users | Not found. API routes catch and return generic messages. Server actions return generic text (`rebuttals.ts`), except a Cloudinary error message is appended (`rebuttals.ts:99-100`, Low). `global-error.tsx:54` shows `error.message`, which Next replaces with a generic message for server errors in production builds | |
| robots and metadata | `robots: { index: true, follow: true }` and Open Graph in `src/lib/metadata.ts:12-29`. No `robots.txt` or sitemap | S-28 |
| 404 and 500 pages | `src/app/not-found.tsx`, `src/app/global-error.tsx`, `src/app/(public)/error.tsx` and several route `error.tsx` files exist. `/unauthorized` is missing | S-26 |
| Basic accessibility | Spot checks: form inputs have `<label htmlFor>`; decorative icons use `aria-hidden="true"`; no raw `<img>`; skip link in `GlobalHeader.tsx`; reduced-motion rule present. **No automated accessibility scan was run** (no axe tooling in the repo). A separate audit exists only on unmerged `origin/CH-27-accessibility-audit` | Not verified beyond spot checks |
| README with setup and deploy | Setup: yes, `docs/README.md` (local only). Root `README.md` is boilerplate. **Deploy steps: missing. Rollback plan: missing. Backup procedure: missing. 60-day stabilization runbook: missing** (a template exists on unmerged `origin/CH-32-training-material:docs/training/go-live-stabilization.md`) | S-20 |

### Data and migrations

All 18 migrations, in order. Flags come from `grep` for `DROP`, `DELETE`, `TRUNCATE`, `RENAME`, `SET NOT NULL` and type changes.

| # | Migration | Destructive statements |
|---|---|---|
| 1 | `20260512115623_init` | None |
| 2 | `20260516045553_add_rebuttal_and_facility_models` | None |
| 3 | `20260516103613_init` | None |
| 4 | `20260604125118_add_membership_tiers` | **Drops and re-creates `Membership.plan` and `Membership.status`** (lines 16, 18). Existing values in those two columns are lost (reset to NONE / INACTIVE) |
| 5 | `20260610192728_stripe_membership_clean` | None |
| 6 | `20260615055700_add_facility_slug_and_rebuttal_facility` | `Facility.slug SET NOT NULL` (line 13); fails if any row has no slug |
| 7 | `20260719000000_add_organization_model` | **Drops `Membership.userId`** (line 85) after back-filling one Organization per user (lines 17-54). Data is moved, not lost |
| 8 | `20260724081858_add_moderation_audit_trail` | None |
| 9 | `20260820000000_add_watermarked_url` | None |
| 10 | `20260824140143_add_membership_consent` | `Membership.organizationId SET NOT NULL` (line 14); fails if any membership has no org |
| 11 | `20260826190000_soft_delete_and_archive_logs` | None |
| 12 | `20260901000000_add_member_file` | None |
| 13 | `20260904000000_add_file_share_links` | None |
| 14 | `20260904051356_add_consent_document_public_id` | None |
| 15 | `20260914062032_add_canceled_at` | None |
| 16 | `20261010120000_add_processed_stripe_event` | None (new table) |
| 17 | `20261010130000_add_login_lockout` | None (two new nullable or defaulted columns on `User`) |
| 18 | `20261010140000_add_login_attempt` | None (new table) |

Conclusion: the only migrations still pending on dev and prod (16 to 18) are purely additive and will not destroy data on a database that already has real users. Migrations 4 and 7 are destructive, but they only run on a database that has not applied them yet. A database that was set up without `prisma migrate` (as the local dev DB was, per KNOWN_ISSUES "Infrastructure") must be baselined with `prisma migrate resolve`, not deployed fresh, or migration 4 would reset plans. **Take a `pg_dump` before any `migrate deploy`.**

## Part 3: Payment readiness

### Annex B deliverables

| Deliverable | State | Evidence |
|---|---|---|
| Discovery Summary | Not started | Not found on any branch |
| Ethics and Compliance Policy Pack | Needs work | Disclaimers done; Privacy and Terms DRAFT; ethics/supervision and conflicts missing |
| Governance Pack (bylaws, COI, minutes templates) | Not started | Not found |
| Web Stack (Notion, Forms, CRM, Calendly, SignWell), live links | Needs work | Only a Notion URL in `.env`. A custom app was built instead. Needs a change order and live links |
| LPO SOPs, QA checklist, versioning guide | Needs work | SOPs exist, `lpo-workflow-sop.md` unmerged (CH-28). No versioning guide. No standalone QA checklist |
| Training materials (slides, playbooks, screencasts) | Needs work | Playbooks exist (partly unmerged, CH-32). No slides. No screencasts |
| Go-live and stabilization reports | Not started | Template only (unmerged CH-32). Go-live has not happened |

None of the seven is ready to hand over as-is.

### What we must send the client

1. Signed change orders CO-1 to CO-5 (`docs/SOW_GAP_ANALYSIS.md` Part 3), with fee and schedule impact.
2. A UAT pack: production or staging URL, test accounts per role (not the seed passwords), a UAT script per feature, and the known-issues list.
3. Policy Pack v1 (Word or PDF) for approval, including the missing ethics/supervision and conflicts policies.
4. The Discovery Summary for signature.
5. Merged and exported SOPs, playbooks, training slides and screencast links.
6. Pilot evidence: two test matters end to end with attorney approvals recorded.
7. Live links for every external tool that remains in scope after the change order.
8. An invoice per the MSA or Order Form schedule.

### What the client must do for acceptance

1. UAT within 5 business days of each submission (SOW 9.1). Deliverable reviews within 3 business days (SOW 7.1).
2. Approve policies in writing (SOW 9.3, RACI "Approve policies": Client Accountable).
3. Name the partner attorneys (SOW 6, 8.1) and have them run and approve the pilot matters (RACI "Pilot matters": Partner Attorney Accountable).
4. Sign the change orders.
5. Set up and pay for the vendor subscriptions (SOW 6).

### Contract items you must confirm yourself

Blank fields in `docs/SOW_Nonprofit_LPO_Single_Integrator web base business_21JUN2026.docx`:

- Client (Nonprofit) name
- Prime Integrator (Consultant/Firm) name
- Effective Date
- SOW ID
- Term (months)
- Primary Contact (Client)
- Primary Contact (Integrator)
- Signature block, Client: signature, date, name/title
- Signature block, Integrator: signature, date, name/title

Other items:

- **Pricing:** not stated. SOW 14.1 says commercials are in the MSA or Order Form. Neither is in the repo. Confirm one exists and is signed.
- **Billing model:** SOW 14.2 allows time and materials or fixed-fee phases. Which one applies is not stated.
- **Invoice terms:** net 15 days unless otherwise agreed (SOW 14.3). Invoice schedule: not stated.
- **Expenses:** billed at cost with prior approval (SOW 14.2). Ongoing third-party costs need client approval (SOW 7.2).
- **IP transfer:** the client owns deliverables only on full payment (SOW 15.1).
- **Mutual NDA:** referenced in SOW 16.1. Not in repo; confirm it is signed.
- **Change orders:** none found. At least CO-1 (custom app instead of tool stack) is needed before acceptance can fairly be requested.
- **Project tracker and risk register** (SOW 18, 19): not in repo. Confirm they exist.

## Prioritized fix list

| Order | ID | Fix | Effort |
|---|---|---|---|
| 1 | S-1 | Stop exposing `documentUrl` publicly (facility page and published API) | Medium |
| 2 | S-2 | Remove emails from public facility and published-rebuttal responses | Small |
| 3 | S-3 | Upgrade `next` to a patched release; re-run all tests | Small to Medium |
| 4 | S-4 | Back up, then apply migrations 16 to 18 on dev and prod | Small |
| 5 | S-5 | Confirm or rotate production JWT secret, Gmail app password, DB password | Small |
| 6 | S-7 | Guard the seed script; check prod for the seeded admin | Small |
| 7 | S-6 | Merge and review CH-48; implement the agreed watermark(s); fix D-3/D-4/D-6 | Medium |
| 8 | S-8 | Draft and sign change orders | Medium |
| 9 | S-9 | Decide intake and e-signature (merge CH-40 or external tools) | Medium to Large |
| 10 | S-10 | Finish and approve policies; remove DRAFT banners after approval | Medium |
| 11 | S-11, S-13, S-14, S-18, S-21, S-22, S-23 | Expiry validation, security headers, access review, lint, GA consent, signer PII, Docker | Small each |
| 12 | S-12, S-15, S-16, S-17, S-19, S-20 | Private storage, session revocation, audit log, dependency upgrades, E2E failures, ops docs | Medium each |
| 13 | S-24 to S-28 | Low items | Small each |

## What could not be checked, and why

- **Dev and production databases** (migration state, whether the seed admin exists, real data): forbidden by the audit rules.
- **Production secrets and hosting** (whether leaked values are in use, proxy `X-Forwarded-For` behavior, encryption at rest at the providers): no access, and nothing in the repo shows the deployment target.
- **All external tools** (Notion content, Forms, Airtable, Calendly, SignWell, Drive, GitHub issues): outside the repo.
- **Contract documents** (MSA, Order Form, NDA, change orders, signed SOW): not in the repo.
- **Lint results:** ESLint crashes before reporting.
- **Accessibility:** spot checks only; no automated scan tool in the repo.
- **Unmerged branch content** (CH-28, CH-32, CH-34, CH-40, CH-48): listed and skimmed, not audited or tested as release code.
