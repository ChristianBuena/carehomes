# SOW Status Now

Checked: 2026-10-31, branch `main` at `09ffcd5` (merge of PR #38, `release-blockers`). Working tree clean. Read-only check: no code or other docs changed. The open PR and its branch were not touched.

SOW source: `docs/SOW_Nonprofit_LPO_Single_Integrator web base business_21JUN2026.docx` (now tracked). Row list: the 93 rows of `docs/SOW_GAP_ANALYSIS.md` Part 1. Every row was re-checked against code on `main` or against a file in the repo. "Not found" means no evidence in the repo.

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

| Status | Rows |
|---|---|
| DONE IN CODE | 3 |
| DONE IN DOCUMENT | 17 |
| EXTERNAL | 14 |
| DOCUMENT NOT WRITTEN | 34 |
| NOT DELIVERED | 25 (8 owned by code, 17 need a change order) |
| **Total** | **93** |

Change from the gap analysis: the gap analysis listed 3E.3, 3E.7, 3A.2, 10.1, 13 and others as PARTIAL or MISSING. On `main` the QA checklist (`docs/lpo-workflow-sop.md:122-133`), redline procedure (`lpo-workflow-sop.md:72-88`), stabilization plan (`docs/training/go-live-stabilization.md`) and change order draft (`docs/CHANGE_ORDER_DRAFT.md`) exist, so those are now DONE IN DOCUMENT. No code row moved to DONE.

## 2. Every row that is not DONE

Owner key: **code** = a code change in this repo; **me** = integrator (you); **client**; **partner attorney** (includes ethics counsel); **external tool** = setup in the named tool.

### 2a. NOT DELIVERED, owned by code (8)

| Row | Requirement | Evidence on `main` | Owner | Next action |
|---|---|---|---|---|
| 3E.5 | Audit trail (activity logs) | No `AuditLog` model in `prisma/schema.prisma` (models at lines 41-646). Logged: moderation (`src/services/moderation.service.ts:19`), takedown unpublish (`src/services/takedown.service.ts:411`), share-link opens (`src/app/api/share/[token]/route.ts:100-110`), template downloads (`src/services/template.service.ts:90`). Not logged: login success, logout, signup, facility claim, rebuttal edit, share-link create/revoke, file upload/delete (`console.log` only, `src/lib/uploadthing.ts:52`), billing/plan override (`console.log` only, `src/app/api/membership/update/route.ts:61`), role changes, access review (no reviewer) | code | Add an `AuditLog` model (actor, action, target, time, IP) and write it from login, logout, signup, claim, rebuttal submit/edit, share create/revoke, file upload/delete, membership update, role change and access review |
| 11.1a | Least-privilege access | Role is read from the 7-day JWT (`src/lib/jwt.ts:34`, `src/middleware.ts:21,40,47`). `resolveSessionUser` refreshes only `orgId` from the DB, not role (`src/lib/auth.ts:21-28`). Logout only clears the cookie (`src/app/api/auth/logout/route.ts:9-15`); no token version or session table (not found), so a stolen or demoted session stays valid up to 7 days. Access-review POST lets any `moderate_rebuttals` holder mark any user, admins included, as reviewed (`src/app/api/admin/access-review/route.ts:82,95-97`) | code | Add a `tokenVersion` (or session table) checked on every request; bump it on logout, password change, role change and deactivation. Read role from the DB, not the token. Block moderators from reviewing ADMIN accounts |
| 11.1b | Quarterly permission audit | Route allows MODERATOR (`access-review/route.ts:23,82`) but middleware returns 403 on `/api/admin/*` without `manage_users` (`src/middleware.ts:47-53`), so the moderator page (`src/app/dashboard/moderation/access-review/page.tsx:42,68`) fails for moderators. POST records only `lastReviewedAt` (line 97): no reviewer, decision or notes. `docs/admin-playbook.md:49-51` says ADMIN and MODERATOR accounts must be reviewed. No completed audit report: not found | code, then me | Decide who runs the review (admin only, or admin + moderator) and make middleware and route agree. Store reviewer id, decision and note per review. Then run and file the first quarterly review |
| 11.3b | Limit PII collection | Signer name and visit date are written into public rebuttal text (`src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx:84`). Unredacted drafts kept in `localStorage` (`RebuttalPrintForm.tsx:35,48`). Emails written to server logs (`src/lib/mailer.ts:33`, `src/services/mfa.service.ts:137`, `src/app/api/moderation/route.ts:221`). Google Analytics loads with no consent banner (`src/app/layout.tsx:29-30`; consent banner: not found) | code | Keep signer name and visit date out of `content`; drop or expire the localStorage draft; remove emails from log lines; gate GA behind consent or remove it |
| 11.3c | Encrypted storage / file privacy | Member files: no `acl` set (`src/lib/uploadthing.ts:11-19`), library default is public-read; stored URL is the public `ufsUrl` (line 44). Rebuttal documents: Cloudinary upload with no `type` (`src/app/actions/rebuttals.ts:29-30`) = public delivery. Share links return raw file URLs (`src/app/api/share/[token]/route.ts:66-90`), so revoking a link does not revoke the file URL. Public APIs no longer return document URLs (`src/app/api/rebuttal/published/route.ts:4-21`). Provider-side encryption at rest: not verifiable from code | code + me | Code: `acl: "private"` for UploadThing and `type: "authenticated"` for Cloudinary; serve files through an authenticated route that issues short-lived signed URLs. Me: change the UploadThing default ACL, and delete or re-key Cloudinary documents of rebuttals approved before PR #38 (RELEASE_READINESS "Stored files") |
| 11.3d | Secure sharing policies | Unknown expiry value silently creates a never-expiring link (`src/app/api/files/share/route.ts:10-14,16-28`); test still `it.fails` (`tests/integration/files.test.ts:407`). The type allows `null` = NEVER (`src/types/share.ts:5`). Revocation and expiry return 410 (`share/[token]/route.ts:45-52`). Written sharing policy: not found | code + me | Reject any expiry other than `7d`, `30d` (and `null` only if NEVER is kept) with 400; decide whether NEVER is allowed at all; flip the `it.fails`. Write a one-page sharing policy |
| 12.2 | Draft turnaround time per matter type | No report or analytics on `main` (`find src -ipath '*analytics*'`: none). No matter-type field on `Rebuttal` | code | Add a report from `Rebuttal.createdAt` to first APPROVED `ModerationLog`; add a matter type if the client wants it per type |
| 12.3 | Attorney revision cycles per draft | No report. Only proxy data: count of REQUEST_FIX `ModerationLog` rows per rebuttal | code | Add the report (moderator fix requests); note in the change order that it counts moderator, not attorney, cycles |

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

### 2c. NOT DELIVERED, needs a change order (17)

All are covered by sections B, C or E of `docs/CHANGE_ORDER_DRAFT.md`. Next action for each: agree the line in the change order and sign it.

| Row | Requirement | Evidence | Owner | Change order line / next action |
|---|---|---|---|---|
| 2.2 | Supervised drafting pipeline with "FOR ATTORNEY REVIEW ONLY" | Roles are MEMBER, MODERATOR, ADMIN only (`prisma/schema.prisma:14-18`). Moderator gate only | me + client | B7, C1 |
| 3D.2a | Membership form (Tally/Google Forms) | Built in app instead: `src/app/api/auth/signup/route.ts`, `src/app/api/stripe/checkout/route.ts` | me + client | B1 (accept app signup) |
| 3D.2b | Intake form | Not found (`find src -iname '*intake*'`: none; no Tally/Forms link) | me + client | C2: choose Tally/Forms or an app feature |
| 3D.2c | Helpdesk form | Contact page uses mailto only (`src/app/(public)/contact/page.tsx`) | me + client | C3 |
| 3D.2d | Auto-log to Airtable/Sheets | Not found (no airtable/sheets in `src`) | me + client | B2 (accept app DB) |
| 3E.2 | "FOR ATTORNEY REVIEW ONLY" watermark | Not in code. See Part 3 item 1 | me + client | C1 (mark applied in the drafting tool) |
| 3E.6 | Secure channel for attorney feedback | Share links are read-only; no feedback path | me + client | B5 |
| 3G.1 | Soft launch with 3-5 member intakes | Blocked: no intake (3D.2b) | me + client | C2, C11 |
| 3H | Optional QSF | Only `MemberFile.isQsfDoc` flag (`prisma/schema.prisma:566`) | client | C14: confirm not elected |
| 4.5 | Forms, CRM, Calendly, SignWell | See 3D rows | me + client | C2-C5, B1-B2 |
| 5.3 | Web stack MVP live links | Notion URL is an env var only (`src/lib/site-config.ts:88,109`, falls back to `https://notion.so`). No forms or CRM | me + client | Section D: replace evidence with "production URL + UAT sign-off" |
| 6.3 | Integrator builds the SOW tool stack | A custom app was built instead | me + client | Section A |
| 7.2 | Free or low-cost tiers | Stripe, UploadThing, Cloudinary, Gmail SMTP, hosting (`package.json`) | client | Section E: written cost approval |
| 11.2a | Watermark on drafts | Same as 3E.2 | me + client | C1 |
| 12.1 | Intake-to-assignment SLA | No intake; `Rebuttal` has no assignee field | me + client | C13 |
| A.2 | Build web stack (RACI) | Same as 6.3 | me + client | Section A |
| B.4 | Annex B: web stack live links | Same as 5.3 | me + client | Section D |

### 2d. EXTERNAL, link needed (14)

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

### 2e. DOCUMENT NOT WRITTEN (34)

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
| 10.2 | P1 < 4h, P2 < 1 day, P3 < 2 days | `go-live-stabilization.md:76` says P3 "Within 3 business days" (SOW says 2). `incident-response-playbook.md:45` gives P1 only; P2 to P4 have no times (lines 49-87). Alerting/monitoring: not found in `package.json` | me (+ code for alerting) | Fix P3 to 2 business days; add P2/P3 times to the playbook; name on-call owners; add error alerting |
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

1. **Watermark (11.2).** The only stamp is "PUBLIC REDACTED VERSION" (`src/services/pdf-watermark.service.ts:14`). It runs only when a moderator or admin manually calls `POST /api/rebuttal/watermark` (`src/app/api/rebuttal/watermark/route.ts:12-24`); nothing in `src` calls it, although the route comment says "Called automatically when a rebuttal is approved" (line 10). The result is stored as a base64 `data:` URL in the DB (lines 81-86). "FOR ATTORNEY REVIEW ONLY" appears only in marketing copy (`src/app/(public)/independent-providers/page.tsx:210`). Public pages also promise features the code does not have: "Approved rebuttals automatically generate ... cryptographically timestamped and watermarked PDFs" (`src/app/(public)/membership-guide/page.tsx:150`, also line 501), "tamper-evident watermarked PDFs" (`src/app/(public)/pricing/page.tsx:159`), "Watermarked PDF generation" (`docs/member-onboarding-sop.md:43`). `docs/moderation-sop.md:75-78` tells moderators to confirm the document is watermarked.
2. **No security headers.** `next.config.ts` has no `headers()`; no CSP, HSTS, X-Frame-Options or X-Content-Type-Options anywhere in `src` (grep: not found). RELEASE_READINESS S-13 still open.
3. **Sessions cannot be revoked; role is up to 7 days stale** (`jwt.ts:34`, `middleware.ts:21`, `auth.ts:21-28`, `logout/route.ts:9-15`). Contradicts least privilege (11.1).
4. **Access review** is blocked for moderators by middleware, records no reviewer, and lets a moderator mark admins reviewed (`middleware.ts:47-53`, `access-review/route.ts:23,82,97`). Contradicts the quarterly permission audit (11.1) and `docs/admin-playbook.md:49-51`.
5. **Files are reachable without login** (UploadThing default ACL, `uploadthing.ts:11-19,44`; Cloudinary public delivery, `rebuttals.ts:29-30`). Revoking a share link does not revoke the file URL. Contradicts "encrypted storage and secure sharing" (11.3).
6. **Share link expiry**: unknown values create a never-expiring link (`files/share/route.ts:10-28`; `files.test.ts:407` still `it.fails`). Contradicts secure sharing (11.3).
7. **No general audit log** (no `AuditLog` model). Contradicts "audit trail (activity logs)" (3E, referenced by 11).
8. **Extra PII**: signer name and visit date in public text, localStorage drafts, emails in logs, GA without consent (see 11.3b). Contradicts "limit PII collection" (11.3).
9. **MFA OTP stored in plain text** (`src/services/mfa.service.ts:121`). Weakens "enforce MFA" (11.1).
10. **Retention policy vs code**: `docs/policies/data-retention-policy.md` section 4 says deleting a file in the app does not delete it at the provider, but member-file delete does call `utapi.deleteFiles` (best effort, `src/app/api/files/route.ts:84-89`). Cloudinary rebuttal documents are never deleted. The policy text needs correcting for member files.
11. **Auth guard file is deprecated**: guards live in `src/middleware.ts`; Next.js 16 renamed this convention to `proxy.ts` (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md:11`). It still runs today, but a future upgrade could drop it silently and remove every page guard.
12. **SLA text**: P3 is "Within 3 business days" in `docs/training/go-live-stabilization.md:76`; SOW 10 says 2.

## 4. Top 5 blockers to sign-off

1. **Change order not signed** (`docs/CHANGE_ORDER_DRAFT.md`). 17 rows, including the web stack (B.4), watermark (3E.2, 11.2a), intake and e-signature, cannot be accepted without it. Owner: me + client.
2. **Security section code gaps** (2a): file privacy, share-link expiry, session revocation, access review, audit log, plus no security headers. Owner: code (file privacy also needs storage dashboard changes by me).
3. **Policies not approved** (9.3, A.1, 3B.3): every policy is DRAFT and Privacy/Terms pages say so. Owner: partner attorney, then client.
4. **No pilot and no partner attorney named** (5.4, 9.2, A.4, 6.2, 8.1). Acceptance criterion 9.2 depends on it. Owner: client names attorneys; partner attorney + me run the pilot.
5. **Annex B documents not written**: Discovery Summary (B.1), Governance Pack (B.3), versioning guide (B.5), slides and screencasts (B.6). Owner: me (governance with client).
