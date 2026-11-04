# SOW Status Now

Checked: 2026-10-31, branch `main` at `09ffcd5` (merge of PR #38, `release-blockers`). Working tree clean. Read-only check: no code or other docs changed. The open PR and its branch were not touched.

SOW source: `docs/SOW_Nonprofit_LPO_Single_Integrator web base business_21JUN2026.docx` (now tracked). Row list: the 93 rows of `docs/SOW_GAP_ANALYSIS.md` Part 1. Every row was re-checked against code on `main` or against a file in the repo. "Not found" means no evidence in the repo.

**Update 2026-10-31, branch `sow-code-gaps`** (local, not pushed; 12 commits on top of `main` at `d1c7933`). The eight code-owned rows from the first version of this file were worked. Six are now DONE IN CODE; 11.3c moved to EXTERNAL (provider settings) and 11.3d to DOCUMENT NOT WRITTEN (sharing policy). The watermark rows 3E.2 and 11.2a were implemented in code too, so they no longer need a change order. Rows below cite code on that branch. Everything else was not re-checked and is as in the first version.

Status key (exactly one per row):

| Status | Meaning |
|---|---|
| DONE IN CODE | Implemented on `main` and verified in code |
| DONE IN DOCUMENT | The document exists in the repo (it may still need approval, see Part 2b) |
| EXTERNAL | Lives in a third-party tool or outside the repo; a live link or record is needed |
| DOCUMENT NOT WRITTEN | The document or record does not exist in the repo |
| NOT DELIVERED | Not built as the SOW says. Needs either a code fix (owner "code") or a change order |

The five statuses have no separate "code gap" slot. Rows where the code exists but falls short of the SOW are marked NOT DELIVERED with owner **code**; the next action is a code fix, and a change order only if the client agrees to drop the item.

## 1. Counts

| Status | First version (`main` @ `09ffcd5`) | Now (`sow-code-gaps`) |
|---|---|---|
| DONE IN CODE | 3 | 11 |
| DONE IN DOCUMENT | 17 | 17 |
| EXTERNAL | 14 | 15 |
| DOCUMENT NOT WRITTEN | 34 | 35 |
| NOT DELIVERED | 25 (8 code, 17 change order) | 15 (0 code, 15 change order) |
| **Total** | **93** | **93** |

Moved: 3E.5, 11.1a, 11.1b, 11.3b, 12.2, 12.3, 3E.2, 11.2a to DONE IN CODE; 11.3c to EXTERNAL; 11.3d to DOCUMENT NOT WRITTEN.

## 2. Every row that is not DONE

Owner key: **code** = a code change in this repo; **me** = integrator (you); **client**; **partner attorney** (includes ethics counsel); **external tool** = setup in the named tool.

### 2a. NOT DELIVERED, owned by code (0)

None. What happened to the eight rows:

| Row | Now | Evidence on `sow-code-gaps` | Still needs |
|---|---|---|---|
| 3E.5 Audit trail | DONE IN CODE | `AuditLog` table; DB triggers reject UPDATE/DELETE/TRUNCATE (`prisma/migrations/20261031120000_add_audit_log/migration.sql`); `src/services/audit.service.ts` (insert only); login, logout, signup, claims, rebuttals, moderation, files, share links, billing, seats, access review, takedowns, templates, exports recorded; ADMIN CSV export `src/app/api/admin/audit-log/route.ts`; `tests/integration/audit-log.test.ts` | A retention period from counsel (table grows without limit) |
| 11.1a Least privilege | DONE IN CODE | `User.tokenVersion`; every request checks the session and reads the CURRENT role from the DB (`src/lib/auth.ts`, `src/proxy.ts`); logout revokes all sessions; `POST /api/admin/sessions/revoke`; moderators cannot review ADMIN accounts or themselves (`src/app/api/admin/access-review/route.ts`); `tests/integration/session-revocation.test.ts`, `tests/unit/session-guard.test.ts` | Nothing in code |
| 11.1b Quarterly permission audit | DONE IN CODE | Proxy lets MODERATOR reach the review only (`src/proxy.ts`); `AccessReview` table with reviewer, role, decision, notes, date; export `src/app/api/admin/access-review/export/route.ts`; page updated; `tests/integration/access-review.test.ts`, `tests/e2e/access-review.spec.ts` | **me:** run and file the first quarterly review. Covers app users only, not Notion/Drive/Stripe accounts |
| 11.3b Limit PII | DONE IN CODE | Signer name and dates in private columns, not in published text (`src/app/actions/rebuttals.ts`, print form); no drafts in localStorage (both print forms); no emails in logs (`src/lib/log-safe.ts`); GA only after consent (`src/components/layout/AnalyticsConsent.tsx`); `tests/integration/personal-data.test.ts`, `tests/e2e/analytics-consent.spec.ts` | **me/client:** decide on old rebuttals that still contain signer lines (`scripts/list-rebuttals-with-signer-text.ts`, read-only) |
| 11.3c Encrypted storage / file privacy | EXTERNAL (UploadThing, Cloudinary dashboards) | Code part closed: no storage URLs in any response or page; downloads streamed through authenticated routes with signed URLs; share revoke effective at once; new rebuttal documents `authenticated` in Cloudinary; UploadThing `acl: private` behind `UPLOADTHING_PRIVATE_FILES`; `tests/integration/file-privacy.test.ts`, `tests/e2e/share-page.spec.ts`, `tests/e2e/moderation-queue.spec.ts` | **me:** provider settings in `docs/MIGRATION_RUNBOOK.md` P2.7 (old files are still public by URL). Encryption at rest: not verifiable from code |
| 11.3d Secure sharing | DOCUMENT NOT WRITTEN | Code part closed: expiry must be 7 or 30 days, anything else 400 (`src/app/api/files/share/route.ts`, `src/types/share.ts`); A-1 fixed; dialog has no "No expiry" | **me:** one-page sharing policy. Existing never-expiring links listed by the query in runbook P2.4 |
| 12.2 Turnaround | DONE IN CODE | `src/services/kpi-report.service.ts`, `GET /api/admin/reports/kpi?report=turnaround`, `/dashboard/reports`; `tests/integration/kpi-reports.test.ts` | One matter type only (no field for it); calendar hours |
| 12.3 Revision cycles | DONE IN CODE | Same files, `report=revisions`, target 2 | Counts moderator fix requests (no separate attorney step in the app) |

### 2b. DONE IN DOCUMENT, but still waiting on approval (counted as done; listed so nothing is hidden)

| Row | File | Owner | Next action |
|---|---|---|---|
| 3B.1, 11.4 | `docs/policies/ethics-supervision-policy.md` (header "DRAFT - for attorney review") | partner attorney | Counsel review, answer "Open questions for counsel", including CA rule alignment |
| 3B.2b | `docs/policies/conflicts-protocol.md` (DRAFT) | partner attorney | Counsel review |
| 3B.2c | `docs/policies/data-retention-policy.md` (DRAFT). Code does not enforce it: no deletion job except moderation log archive (`moderation.service.ts:135`) | partner attorney, then code | Counsel review; then retention jobs in code |
| 4.2, 5.2, B.2 | Policy pack: `docs/policies/*`, disclaimer page; Privacy and Terms still DRAFT (`src/app/(public)/privacy/page.tsx:52,78`, `terms/page.tsx:10,82`) | me, then client | Export to Word/PDF as "Policy Pack v1" and send to the client |
| 3E.1, A.3 | `docs/lpo-workflow-sop.md`, `docs/attorney-onboarding-sop.md` | partner attorney | Record counsel and partner attorney consultation (RACI "C") |
| 13 | `docs/CHANGE_ORDER_DRAFT.md` (unsigned, "[to be agreed]" throughout) | me + client | Fill in and sign |
| 11.3a | No-PHI control = redaction tick (`src/app/actions/rebuttals.ts:57-59`) + `docs/moderation-sop.md` Stage 2 | client | Accept human review as the PHI control in writing |
| 10.1, 2.4 | `docs/training/go-live-stabilization.md`; training docs in `docs/training/` | me | Set the go-live date |

### 2c. NOT DELIVERED, needs a change order (15)

All are covered by sections B, C or E of `docs/CHANGE_ORDER_DRAFT.md`. Next action for each: agree the line in the change order and sign it.

| Row | Requirement | Evidence | Owner | Change order line / next action |
|---|---|---|---|---|
| 2.2 | Supervised drafting pipeline with "FOR ATTORNEY REVIEW ONLY" | The draft mark now exists in the app (11.2a). Still no attorney role: MEMBER, MODERATOR, ADMIN only; moderator gate only | me + client | B7 (C1 no longer needed for documents in the app) |
| 3D.2a | Membership form (Tally/Google Forms) | Built in app instead: `src/app/api/auth/signup/route.ts`, `src/app/api/stripe/checkout/route.ts` | me + client | B1 (accept app signup) |
| 3D.2b | Intake form | Not found (`find src -iname '*intake*'`: none; no Tally/Forms link) | me + client | C2: choose Tally/Forms or an app feature |
| 3D.2c | Helpdesk form | Contact page uses mailto only (`src/app/(public)/contact/page.tsx`) | me + client | C3 |
| 3D.2d | Auto-log to Airtable/Sheets | Not found (no airtable/sheets in `src`) | me + client | B2 (accept app DB) |
| 3E.6 | Secure channel for attorney feedback | Share links are read-only; no feedback path | me + client | B5 |
| 3G.1 | Soft launch with 3-5 member intakes | Blocked: no intake (3D.2b) | me + client | C2, C11 |
| 3H | Optional QSF | Only `MemberFile.isQsfDoc` flag (`prisma/schema.prisma:566`) | client | C14: confirm not elected |
| 4.5 | Forms, CRM, Calendly, SignWell | See 3D rows | me + client | C2-C5, B1-B2 |
| 5.3 | Web stack MVP live links | Notion URL is an env var only (`src/lib/site-config.ts:88,109`, falls back to `https://notion.so`). No forms or CRM | me + client | Section D: replace evidence with "production URL + UAT sign-off" |
| 6.3 | Integrator builds the SOW tool stack | A custom app was built instead | me + client | Section A |
| 7.2 | Free or low-cost tiers | Stripe, UploadThing, Cloudinary, Gmail SMTP, hosting (`package.json`) | client | Section E: written cost approval |
| 12.1 | Intake-to-assignment SLA | No intake; `Rebuttal` has no assignee field | me + client | C13 |
| A.2 | Build web stack (RACI) | Same as 6.3 | me + client | Section A |
| B.4 | Annex B: web stack live links | Same as 5.3 | me + client | Section D |

### 2d. EXTERNAL, link needed (15)

| Row | Requirement | Tool | Evidence | Owner | Next action |
|---|---|---|---|---|---|
| 2.1 | Hub with downloadable templates | Notion | Guidance pages are public. In-app templates need login (`src/app/api/templates/[id]/download/route.ts:17-20`). `public/templates/*.docx` and `*.pdf` exist but no page links them (grep of `src`: not found) | me | Put Word templates in the Notion KB and send the live link, or link `public/templates/*` from a public page |
| 3C.1 | Entity formation, bylaws, COI, EIN, bank | CA Secretary of State, IRS (EIN), bank | Not found | client | Send filing receipts and EIN letter |
| 3C.2 | 501(c) filing, CA charitable registration | IRS, CA AG Registry of Charitable Trusts | Not found. Site calls itself a nonprofit (`src/components/layout/GlobalFooter.tsx:31`) | client | Send determination letter or filing receipt |
| 3D.1 | Notion knowledge base | Notion | Env var only (`site-config.ts:88,109`) | me | Send the live Notion URL; set `NEXT_PUBLIC_NOTION_KB_URL` in production |
| 3D.3 | Calendly setup | Calendly | Not found | me | Create the page and send the link, or drop by C4 |
| 3D.4 | SignWell templates | SignWell | Not found. `ConsentLog`/`MembershipAgreement` models are never written (grep: not found) | me | Create templates and send links, or drop by C5 |
| 3D.5 | Drive structure, least privilege | Google Drive | Not found. App uses UploadThing/Cloudinary for member files | me | Send the Drive folder map and sharing settings (needed for off-app drafting) |
| 3F.3 | 5-7 screencasts in the KB | Notion + video host | `docs/training/screencast-plan.md` plans 7; no recording links (not found) | me | Record, upload, link from Notion |
| 4.4 | Public Notion KB with Word templates | Notion | Same as 3D.1 | me | Same as 3D.1 |
| 10.3 | Weekly status and issue log | Airtable/Sheets (SOW 19) or GitHub Issues | Not found | me | Create the tracker and send the link |
| 12.4 | Defect rate | Issue tracker | Not found | me | Track blocking issues per 10 matters in the 10.3 tracker |
| 12.5 | CSAT | Survey form (Tally/Google Forms) | Not found (no CSAT in `src`) | me | Create the survey and send the link |
| 14 | MSA or Order Form with pricing | Signed contract (location not found) | Not found; SOW has no pricing | me + client | Confirm the signed MSA/Order Form exists |
| A.5 | Nonprofit filings (RACI) | Same as 3C | Not found | client | Same as 3C.1/3C.2 |
| 11.3c | Encrypted storage, file privacy | UploadThing and Cloudinary dashboards | Code closed (see 2a). Files uploaded before this branch keep public URLs until the settings change | me | Runbook P2.7: enable UploadThing private files, set `UPLOADTHING_PRIVATE_FILES=true`, make old files private; convert or delete old public Cloudinary documents; strict transformations on |

### 2e. DOCUMENT NOT WRITTEN (35)

| Row | Requirement | Evidence | Owner | Next action |
|---|---|---|---|---|
| 2.3 | Governance, ethics, confidentiality, data policies | Ethics, conflicts, retention drafts exist; governance pack and confidentiality policy not found | me + client | Write the governance pack (4.3) and confidentiality policy (3B.2a) |
| 3A.1 | Stakeholder interviews | Not found | me + client | Write the Discovery Summary |
| 3A.3 | Security and privacy baseline | `docs/PERMISSIONS.md` covers app roles only. Baseline covering app + Notion/Drive/Stripe: not found | me | Write the baseline (access model per tool, MFA per tool, storage, logging) |
| 3B.2a | Confidentiality policy | `ethics-supervision-policy.md:40-42` refers to "the confidentiality policy", which is not found. Privacy page is public-facing and DRAFT | me, then partner attorney | Write the internal confidentiality policy for the PH team |
| 3B.3 | Ethics counsel review | Pages still say "subject to formal attorney review" (`privacy/page.tsx:83`, `terms/page.tsx:87`). Review record not found | partner attorney | Review and send a written sign-off |
| 3C.3 | Renewal calendar and compliance checklist | Not found | me | Write it |
| 3E.4 | Naming and versioning standards | `lpo-workflow-sop.md:113-118` says "a consistent naming convention" without defining one; only version numbers (v1.0, v1.1) are given. App overwrites drafts in place (`src/app/actions/rebuttals.ts` `updateRebuttal`, ~lines 142-175) | me | Define the file naming pattern (matter id, doc type, date, version, status) |
| 3F.1 | Live onboarding (leadership, ops, attorneys) | Agenda covers the three audiences (`docs/training/onboarding-session-agenda.md:11-14`); attendance section empty (lines 111-113) | me + client | Hold the session; record date and attendees |
| 3G.2 | 60-day stabilization | Plan exists; issue log and standup notes not found | me | Start after go-live |
| 4.1 | Process maps (PDF), SOP pack (Word/PDF) | SOPs are `.md` only. Tracked PDF/Word files: only `public/templates/*` and the SOW | me | Export SOPs; draw the 9-stage process map as PDF |
| 4.3 | Governance pack | Not found | me + client | Bylaws, COI policy, minutes template |
| 4.6 | LPO SOPs, naming/versioning, QA checklist, redline | SOP, QA checklist and redline exist; naming convention not defined (3E.4) | me | Finish 3E.4 |
| 4.7 | Training slides, playbooks, screencasts | Playbooks exist. Slides: not found. Screencasts: not found | me | Make slides; see 3F.3 |
| 4.8 | Go-live report, stabilization summary | `docs/training/week14-stabilization-summary.md:25` "Template" | me | Write after go-live and week 14 |
| 5.1 | Discovery complete | Not found | me + client | Signed Discovery Summary |
| 5.4 | Pilot on 2 test matters | Not found. No attorney role or attorney user (`prisma/schema.prisma:14-18`, `prisma/seed.ts:116-140`) | partner attorney + me | Run 2 matters end to end; record approvals |
| 5.5 | Training complete | Attendance not found | me + client | Attendance list; post materials to Notion |
| 5.6 | Go-live, first real matters | Not found; blocked by intake (3D.2b) | me + client | Go-live record after C2 is settled |
| 5.7 | Stabilization report | Template only | me | Write at week 14 |
| 6.1 | Client approvals and branding | Written approvals not found | client | Send approvals in writing |
| 6.2 | Partner attorneys named | Not found | client | Name the partner attorneys |
| 8.1 | Partner attorney availability | Not found | client | Confirm availability for pilot and sign-off |
| 9.1 | UAT within 5 business days | `docs/HANDOVER_CHECKLIST.md` has steps; UAT pack and sign-off not found | me, then client | Send UAT pack; get sign-off |
| 9.2 | Pilot with documented approvals, no blocking defects | Not found | partner attorney + me | After 2a code items close, run pilot (5.4) |
| 9.3 | Policies approved | Not found; pages DRAFT | client + partner attorney | Written approval; then remove DRAFT banners |
| 10.2 | P1 < 4h, P2 < 1 day, P3 < 2 days | P3 fixed to "Within 2 business days" (`docs/training/go-live-stabilization.md:76`, commit "docs(sla)"). `incident-response-playbook.md` still gives a time for P1 only. Alerting/monitoring: not found | me (+ code for alerting) | Add P2/P3 times to the incident playbook; name on-call owners; add error alerting |
| 11.3d | Secure sharing policies | Code closed on `sow-code-gaps` (expiry 7/30 days only). Written sharing policy: not found | me | Write a one-page sharing policy (who may share, maximum 30 days, revoke when the matter closes, access log review) |
| 11.2b | Versioning standards | Same as 3E.4 | me | Same as 3E.4 |
| A.1 | Approve policies (client A) | Not found | client | Same as 9.3 |
| A.4 | Pilot matters (partner attorney A) | Not found | partner attorney | Same as 5.4 |
| B.1 | Discovery Summary | Not found | me + client | Same as 3A.1 |
| B.3 | Governance pack | Not found | me + client | Same as 4.3 |
| B.5 | LPO SOPs + QA checklist + versioning guide | Versioning guide not written | me | Same as 3E.4 |
| B.6 | Training materials | Slides and screencasts not found | me | Same as 4.7 |
| B.7 | Go-live and stabilization reports | Not found | me | Same as 4.8 |

### 2f. DONE rows (for completeness)

| Row | Status | Evidence |
|---|---|---|
| 3B.2d | DONE IN CODE | `src/app/(public)/disclaimer/page.tsx`; `GlobalFooter.tsx:31,115`; `src/components/sections/DisclaimerBanner.tsx` |
| 11.1c | DONE IN CODE | Login sets only `mfa-pending` (`src/app/api/auth/login/route.ts:88-94`); only `verify/route.ts:83` sets `auth-token`; `jwt.ts:44-46` rejects mfa-pending tokens. Weakness: OTP stored in plain text (`mfa.service.ts:121`). MFA on Notion/Drive/Stripe: not checked |
| 11.3e | DONE IN CODE | `src/lib/auth-utils.ts:7` bcrypt cost 10; min length 8 (`signup/route.ts:26`) |
| 3E.5, 11.1a, 11.1b, 11.3b, 12.2, 12.3 | DONE IN CODE | On `sow-code-gaps`; see 2a |
| 3E.2, 11.2a | DONE IN CODE | On `sow-code-gaps`: every view/download of a not-yet-approved rebuttal document is a PDF marked "FOR ATTORNEY REVIEW ONLY" on every page; unmarkable files are refused, never served unmarked (`src/app/api/rebuttal/[id]/document/route.ts`, `src/services/pdf-watermark.service.ts`). Approval makes the "PUBLIC REDACTED VERSION" copy; on failure approval still succeeds, the rebuttal is flagged and a moderator can retry (`src/services/approved-copy.service.ts`). New uploads limited to PDF/PNG/JPG. `tests/integration/draft-watermark.test.ts`, `tests/e2e/draft-watermark.spec.ts`. Drafts written outside the app still follow the LPO SOP |
| 2.4, 3A.2, 3B.1, 3B.2b, 3B.2c, 3E.1, 3E.3, 3E.7, 3F.2, 4.2, 5.2, 10.1, 11.3a, 11.4, 13, A.3, B.2 | DONE IN DOCUMENT | See 2b. 3A.2: `lpo-workflow-sop.md` sections 1-9. 3E.3: QA checklist `lpo-workflow-sop.md:122-133`. 3E.7: `lpo-workflow-sop.md:72-88`, `attorney-onboarding-sop.md` Phase 3. 3F.2: `docs/training/*-playbook.md`, `docs/admin-playbook.md` |

### Training coverage check (SOW 3F and 4)

| SOW item | In `docs/training`? |
|---|---|
| Live onboarding for client leadership, operations, partner attorneys | Agenda yes (`onboarding-session-agenda.md:11-14`). Attendance: not recorded |
| Quick-reference playbooks | Yes: member, moderation, attorney, incident playbooks, plus `docs/admin-playbook.md` |
| 5-7 short screencasts hosted in the KB | Plan for 7 (`screencast-plan.md:32-147`). Recordings and links: not found |
| Slides (SOW 4) | Not found |
| Hosted in the knowledge base | Not done: docs live only in the repo; KB URL is an env var (`screencast-plan.md:23-26`) |

## 3. Code and docs that still contradict SOW Section 11

First-version items 1 to 9 and 12 are fixed on `sow-code-gaps` (watermark, security headers, session revocation, access review, file URLs, share expiry, audit log, extra PII, SLA text). Item 10 (retention policy says file deletes do not reach the provider) and the items below remain.

1. **Old files are still public by URL** until the provider settings change (runbook P2.7). The code no longer hands the URLs out.
2. **MFA one-time codes are stored in plain text** (`src/services/mfa.service.ts`, `MfaOtp.code`). Not in this task's list.
3. **CSP allows inline scripts** (`'unsafe-inline'`, `src/config/security-headers.ts`). That is the Next.js "without nonces" setup; nonces would make every page dynamic. HSTS has no `includeSubDomains`/`preload`: the domain owner should choose.
4. **`useAuth` caches the user's profile (name, email, role) in `sessionStorage`** (`src/hooks/useAuth.ts`), and both login pages write `localStorage.token` (the login API returns no token, so the value is empty). Not drafts, so left alone; worth removing.
5. **No retention job** for any table, including the new audit log (`docs/policies/data-retention-policy.md` needs a period from counsel). The retention policy text about provider deletion is wrong for member files (they are deleted at UploadThing) and right for Cloudinary documents (never deleted).
6. **The approved copy is stored as base64 in the database row** (inherited from the old watermark route, defect D-7 family). Fine for small PDFs; large ones bloat the table.
7. **next/font fonts are downloaded but not applied**: body text uses the system font. Not a security issue; found while testing fonts under the CSP.

## 4. Top 5 blockers to sign-off

1. **Change order not signed** (`docs/CHANGE_ORDER_DRAFT.md`). 15 rows depend on it (web stack, intake, e-signature, attorney pipeline). Line C1 (watermark) can now say "built in the app". Owner: me + client.
2. **Policies not approved** (9.3, A.1, 3B.3). Owner: partner attorney, then client.
3. **No pilot and no partner attorney named** (5.4, 9.2, A.4, 6.2, 8.1). Owner: client, then partner attorney + me.
4. **Deploy steps only you can do**: apply the 8 pending migrations (runbook Parts 1 and 2), the storage settings (P2.7), merge `sow-code-gaps` after review, and run the first access review. Owner: me.
5. **Annex B documents not written**: Discovery Summary, Governance Pack, versioning guide, slides and screencasts, sharing policy. Owner: me (governance with client).
