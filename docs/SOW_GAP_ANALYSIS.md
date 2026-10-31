# SOW Gap Analysis

Audit date: 2026-10-31
Audited code: branch `round-3-cleanup-and-skipped-areas` at commit `41d027f` (working tree clean). This is the branch the round 3 test report describes.
SOW source: `docs/SOW_Nonprofit_LPO_Single_Integrator web base business_21JUN2026.docx` (untracked; there is no `docs/SOW.md`). Section numbers below follow that file.

Method: every status below was checked against the code on this branch, by command, or by looking for the document in the repo (all local branches and all `origin/*` branches). Where a claim comes from the existing docs (TEST_REPORT.md, KNOWN_ISSUES.md and others), it was re-checked. Nothing was taken on trust.

Important context for every row:

- Several SOW documents exist **only on unmerged remote branches**, not on the release branch:
  - `origin/CH-32-training-material`: `docs/training/*` (playbooks, onboarding agenda, screencast plan, go-live and week 14 templates)
  - `origin/CH-28-LPO-Workflow`: `docs/lpo-workflow-sop.md`
  - `origin/CH-40-electronics-consent`: membership agreement signing routes
  - `origin/CH-34-analytics-dashboard`: admin analytics, including moderation turnaround
  - `origin/CH-48-fix-public-data-leaks`: fixes for D-1, D-3 and the watermark wiring

  Checked with `git merge-base --is-ancestor origin/<branch> HEAD`, which returned NO for each. These are marked as gaps until merged.
- The docx has blank Client, Integrator, Effective Date, SOW ID, Term, contacts and signature fields. See RELEASE_READINESS.md Part 3.

Status key: DONE = implemented and verified. PARTIAL = exists but incomplete or does not match the SOW wording. MISSING = nothing found. EXTERNAL = lives in a third-party tool; a human must confirm with a live link. NOT CODE = a document or process deliverable that exists as a file in the repo.

## Part 1: Traceability matrix

### Section 2: Objectives

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 2.1 | Operational nonprofit hub with web guidance and downloadable templates | Next.js public site; template library | `src/app/(public)/*` (how-it-works, membership-guide, disclaimer, policies); `src/app/dashboard/library/page.tsx`; `src/app/api/templates/[id]/download/route.ts:20` returns 401 without login | PARTIAL | Guidance pages are public. Templates are members-only (login required), not "downloadable" on a public hub. The SOW put templates in a public Notion KB (see 3D.1). |
| 2.2 | Supervised drafting pipeline marked "FOR ATTORNEY REVIEW ONLY" with clear QA gates | Moderation queue | `src/services/moderation.service.ts:32-97` (APPROVED / REJECTED / REQUEST_FIX); `src/services/pdf-watermark.service.ts:14` | PARTIAL | A moderation gate exists. There is no attorney role (roles are MEMBER, MODERATOR, ADMIN: `src/lib/permissions.ts:41-73`) and no "FOR ATTORNEY REVIEW ONLY" mark (see 11.2). The app moderates member rebuttals for publication. It is not an attorney-supervised drafting pipeline. |
| 2.3 | Governance, ethics/supervision, confidentiality and data-handling policies | Policy pages | `src/app/(public)/privacy/page.tsx:10` title "Privacy Policy (DRAFT)"; `terms/page.tsx:87` "subject to formal attorney review"; disclaimer, redaction and takedown pages exist | PARTIAL | Privacy and Terms are marked DRAFT. No ethics/supervision policy, no conflicts protocol, no governance pack (see 3B, 3C). |
| 2.4 | Basic training and a 60-day stabilization window | Docs | Release branch: `docs/admin-playbook.md`, `docs/member-onboarding-sop.md`, `docs/moderation-sop.md`, `docs/attorney-onboarding-sop.md`. Unmerged: `origin/CH-32-training-material:docs/training/*` | PARTIAL | Training material is split across an unmerged branch. No screencasts, no attendance record, no stabilization runbook or issue log. |

### Section 3A: Discovery and design

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3A.1 | Stakeholder interviews; confirm use cases and priority matters | Not in repo | Searched all branches for "discovery", "stakeholder", "interview": not found | MISSING | Produce the Discovery Summary and get it signed (Milestone 1 evidence). If it exists outside the repo, attach it. |
| 3A.2 | Process map: intake, triage, drafting, attorney review, signature, filing, close | Unmerged doc | `origin/CH-28-LPO-Workflow:docs/lpo-workflow-sop.md` sections 1 to 9 match the nine stages | NOT CODE | Text only, on an unmerged branch. SOW 4.1 asks for a PDF process map. The app implements none of intake, triage, signature, filing or close. |
| 3A.3 | Security and privacy baseline; tool access and permission model | Code and docs | `src/lib/permissions.ts`; `docs/PERMISSIONS.md`; `src/middleware.ts:66-73` | PARTIAL | The app permission model is documented and tested (72 role-by-permission assertions in `tests/unit/permissions.test.ts`). There is no written security and privacy baseline, and no access model for the SOW tool stack (Notion, Drive, Airtable). |

### Section 3B: Ethics and compliance framework

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3B.1 | Outsourcing and supervision SOP aligned to ABA Model Rule 5.3 and CA analogs | Not found | `git grep -E "5\.3\|Model Rule"` across every `origin/*` branch: no hits | MISSING | Write it. This is also an 11.4 security/compliance requirement. |
| 3B.2a | Confidentiality policy | Privacy page | `src/app/(public)/privacy/page.tsx` (DRAFT banner at lines 52, 61, 78) | PARTIAL | Public-facing draft only. No internal confidentiality policy for the PH team. |
| 3B.2b | Conflicts policy | Not found | No conflicts protocol in any doc or page | MISSING | Write the conflicts protocol (also SOW 4.2). |
| 3B.2c | Data retention policy | Privacy page section 6 | `privacy/page.tsx:197-198` | PARTIAL | Draft, not approved. Code does not enforce retention: no deletion job for users, files or rebuttals. Only moderation log archival exists (`moderation.service.ts:135`). |
| 3B.2d | Disclaimer policy | Disclaimer page, footer, banner | `src/app/(public)/disclaimer/page.tsx`; `src/components/layout/GlobalFooter.tsx:31,115`; `src/components/sections/DisclaimerBanner.tsx:31-39` | DONE | "Not legal advice" and "not a government agency" text is present and shown site-wide in the footer. Still needs client approval (9.3). |
| 3B.3 | Ethics counsel review and document update | Not found | Privacy and Terms still say "subject to formal attorney review before launch" (`privacy/page.tsx:83`, `terms/page.tsx:87`) | EXTERNAL | Confirm whether ethics counsel was engaged. The pages show the review has not happened. |

### Section 3C: Nonprofit formation and compliance

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3C.1 | Entity formation, bylaws, COI policy, EIN, bank account | Outside repo | Not found in any branch | EXTERNAL | Human to confirm with filing receipts. Bylaws and COI policy are also a 4.3 deliverable. |
| 3C.2 | IRS 501(c)(3) or 501(c)(6) filings; CA charitable registrations | Outside repo | Not found | EXTERNAL | Human to confirm. Note that the site calls itself a nonprofit (`GlobalFooter.tsx:31`), so confirm the status is real before go-live. |
| 3C.3 | Renewal calendar and compliance checklist | Not found | Not found in any branch | MISSING | Create it. |

### Section 3D: Web-based stack build

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3D.1 | Notion knowledge base with guidance and downloadable Word templates | Notion (link only) | `src/lib/site-config.ts:88,109` reads `NEXT_PUBLIC_NOTION_KB_URL`, falls back to `https://notion.so`. Dev `.env` points at a `viridian-zenith-231.notion.site` page | EXTERNAL | Human to open the live Notion link and confirm content and Word template links. If the variable is unset in production, the footer link goes to the Notion home page. |
| 3D.2a | Membership form (Tally or Google Forms) | Custom app signup + Stripe | `src/app/api/auth/signup/route.ts`; `src/app/api/stripe/checkout/route.ts` | PARTIAL | Built as custom code, not Tally/Forms. Functionally covers membership sign-up. Tool differs from the SOW (needs a change order, see Part 3). |
| 3D.2b | Intake form | Not found | No intake route, page or model (`find src -iname '*intake*'`: nothing). KNOWN_ISSUES.md "Open, other" item 8 says the same | MISSING | Confirmed missing in code. If intake lives in Tally/Forms, provide the live link; 3G.1, 9.2, 12.1 and Milestones 4 and 6 depend on it. |
| 3D.2c | Helpdesk form | Contact page (mailto only); takedown form | `src/app/(public)/contact/page.tsx:89,105` mailto links; `src/components/takedown/TakedownRequestForm.tsx` | PARTIAL | No helpdesk form or ticket log. Takedown intake is a separate, narrower form. |
| 3D.2d | Auto-log forms to Airtable or Sheets | Not found | `grep -ri airtable\|sheets src`: no hits | MISSING | The app logs into its own Postgres database instead. Either deliver the CRM base or cover it in a change order. |
| 3D.3 | Calendly basic setup | Not found | No Calendly link in code or docs | EXTERNAL | Human to provide the live Calendly page. |
| 3D.4 | SignWell e-signature for SLAs, attorney agreements, acknowledgments | Not in code | `ConsentLog` and `MembershipAgreement` models exist (`prisma/schema.prisma`) but no code writes them (`grep consentLog.create`: none). The signing flow is only on unmerged `origin/CH-40-electronics-consent` | MISSING | Confirmed missing on the release branch. If SignWell is used, provide live templates (EXTERNAL). |
| 3D.5 | Google Drive structure with least-privilege permissions | Not in code | App uses UploadThing (`src/lib/uploadthing.ts`) and Cloudinary (`src/app/actions/rebuttals.ts:7-39`) | EXTERNAL | Human to confirm the Drive structure. The app's own storage replaces Drive for member files (tool change). |

### Section 3E: LPO workflow and delivery

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3E.1 | SOPs for drafting under attorney instruction | Docs | `docs/attorney-onboarding-sop.md` (release branch); `lpo-workflow-sop.md` (unmerged CH-28) | NOT CODE | Merge CH-28. Get partner attorney sign-off (RACI says Ethics Counsel and Partner Attorney are Consulted). |
| 3E.2 | "FOR ATTORNEY REVIEW ONLY" watermarking | Code says something else | `src/services/pdf-watermark.service.ts:14` stamps `"PUBLIC REDACTED VERSION"`. `POST /api/rebuttal/watermark` is never called (`grep -rn "rebuttal/watermark" src` only matches the route file itself). No page reads `watermarkedUrl` | MISSING | The required mark does not exist anywhere in code. The only occurrence of the phrase is marketing copy at `src/app/(public)/independent-providers/page.tsx:210`. See 11.2. |
| 3E.3 | Quality checkpoints | Moderation queue + SOP | `docs/moderation-sop.md` "4-Stage LPO Review"; `src/app/api/moderation/route.ts` | PARTIAL | One gate (moderator approve/reject/request fix). No checklist enforced in the UI and no attorney gate. |
| 3E.4 | Naming and versioning standards | Not found | `updateRebuttal()` overwrites title, content and document in place (`src/app/actions/rebuttals.ts:165-175`). No version table. The LPO SOP refers to "the organization's naming and versioning standards" without defining them | MISSING | Write the standard. The app keeps no draft versions. |
| 3E.5 | Audit trail (activity logs) | Several narrow logs | See the 3E audit-trail table below | PARTIAL | Only moderation, share-link access and template downloads are logged. Login, claim, billing, role and file actions are not. |
| 3E.6 | Secure channel for attorney feedback | Share links | `src/app/api/files/share/route.ts:78` (32-byte random token); `src/app/api/share/[token]/route.ts:44-52` (revocation and expiry) | PARTIAL | Read-only file sharing to attorneys. No way for the attorney to send feedback back through the system. |
| 3E.7 | Redline and approval cycle defined | SOP + REQUEST_FIX status | `moderation.service.ts:86-97`; `docs/attorney-onboarding-sop.md` "Phase 3: Redline" | PARTIAL | Request-fix exists. No redline tool, and approval is by a moderator, not a partner attorney. |

### Section 3F: Training and change enablement

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3F.1 | Live onboarding for leadership, operations and partner attorneys | Agenda on unmerged branch | `origin/CH-32-training-material:docs/training/onboarding-session-agenda.md` | EXTERNAL | Attendance evidence is needed for Milestone 5. Not in repo. |
| 3F.2 | Quick-reference playbooks | Docs | Release branch: `admin-playbook.md`, `member-onboarding-sop.md`, `moderation-sop.md`. Unmerged CH-32: five more playbooks | NOT CODE | Merge CH-32. Post to the knowledge base (SOW says "hosted in knowledge base"). |
| 3F.3 | 5 to 7 short screencasts hosted in knowledge base | Plan only | `origin/CH-32-training-material:docs/training/screencast-plan.md` has no recording links | MISSING | Record and link them. |

### Section 3G: Go-live and stabilization

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 3G.1 | Soft launch with first 3 to 5 member intakes; hypercare SLAs | Not found | No intake feature (3D.2b). No launch record | MISSING | Cannot be done in-app without intake. Needs a live intake channel and a dated launch record. |
| 3G.2 | 60-day stabilization: weekly standups, triage, improvements | Template only | `origin/CH-32-training-material:docs/training/go-live-stabilization.md`; `week14-stabilization-summary.md` says "Report Status: Template, final project metrics and outcomes pending" | MISSING | No issue log, no standup notes, no runbook on the release branch. |
| 3H | Optional: §468B QSF coordination | Flag only | `MemberFile.isQsfDoc` in `prisma/schema.prisma` | MISSING | Optional. Confirm with the client whether it was elected. If not, record it as out of scope. |

### Section 4: Deliverables

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 4.1 | Process maps (PDF) and SOP pack (Word/PDF) | Markdown docs | SOPs as `.md` (see 3E.1, 3F.2). No PDF or Word files in repo (`git ls-files '*.pdf' '*.docx'`: only the SOW itself, untracked) | NOT CODE | Export to the required formats. Add a process map. |
| 4.2 | Ethics and supervision policy; confidentiality/data policy; conflicts protocol; standard disclaimers | Partial | See 3B rows | PARTIAL | Only disclaimers are complete. The ethics/supervision policy and conflicts protocol are missing. |
| 4.3 | Governance pack: bylaws, COI policy, board minutes templates | Not found | Not in any branch | MISSING | Produce it, or provide it if it exists outside the repo. |
| 4.4 | Public Notion KB with download links to Word templates | Notion | See 3D.1 | EXTERNAL | Live link needed. |
| 4.5 | Forms, CRM base, Calendly page, SignWell templates | Mostly not built as specified | See 3D.2 to 3D.4 | MISSING | Either deliver or cover by change order. |
| 4.6 | LPO workflow SOPs, naming/versioning conventions, QA checklist, redline/approval procedure | Partial | See 3E rows | PARTIAL | Versioning standard and a standalone QA checklist are missing. |
| 4.7 | Training materials: slides, playbooks, screencasts (links) | Partial | See 3F rows. No slides found (`git ls-tree` on every branch for `*.pptx`, `*slide*`: none) | PARTIAL | Slides and screencasts are missing. |
| 4.8 | Go-live report and 60-day stabilization summary | Template only | See 3G.2 | MISSING | Write after go-live. |

### Section 5: Milestones and acceptance evidence

| SOW ref | Milestone (target) | Acceptance evidence required | Evidence that exists today | Status | Still needed |
|---|---|---|---|---|---|
| 5.1 | Discovery complete (Week 2) | Signed Discovery Summary | Not found | MISSING | Write and get signed. |
| 5.2 | Ethics and compliance draft (Week 3) | Policy Pack v1 delivered | Draft privacy, terms, redaction, takedown and disclaimer pages. No ethics/supervision or conflicts documents | PARTIAL | Assemble Policy Pack v1 as a deliverable file, including the missing policies. |
| 5.3 | Web stack MVP live (Week 4) | Notion / Forms / CRM live links | Notion URL in `.env` only. No Forms or CRM links. The custom app is not deployed from this repo as far as can be seen (no deploy config beyond `Dockerfile` and `docker-compose.yml`) | EXTERNAL | Live links for each tool, or a change order accepting the custom app as the "web stack". |
| 5.4 | LPO SOPs and pilot (Week 5) | Pilot run on 2 test matters | No record of any pilot matter | MISSING | Run two test matters end to end, with attorney approvals recorded (also 9.2). |
| 5.5 | Training complete (Week 6) | Attendance and materials posted | Materials partly on unmerged branch. No attendance record | MISSING | Attendance list and posted materials. |
| 5.6 | Go-Live (Week 7) | First real matters processed | None. Intake is not built | MISSING | Requires go-live. |
| 5.7 | Stabilization report (Week 14) | Post-go-live report | Template only | MISSING | Requires 60 days of operation. |

### Section 6 to 8: Roles, assumptions, dependencies

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 6.1 | Client supplies decision-makers, approvals, branding | Client | Not verifiable | EXTERNAL | Record approvals in writing. |
| 6.2 | Client identifies partner attorneys to supervise and sign | Client | No attorney role or attorney user in code or seed (`prisma/seed.ts` creates ADMIN, MEMBER, free MEMBER only) | EXTERNAL | Confirm names. Without them, 5.4, 9.2 and RACI "Pilot matters" cannot be accepted. |
| 6.3 | Integrator leads build, configures tools, drafts SOPs and policies, trains users | Integrator | Build exists (custom app). Tools, policies and training are partial (see above) | PARTIAL | See 3B to 3G. |
| 7.2 | Free or low-cost tool tiers sufficient; upgrades out of scope unless approved | Code uses paid services | `stripe`, `uploadthing`, `cloudinary`, Gmail SMTP (`package.json`; `src/lib/mailer.ts:4`) | PARTIAL | Stripe fees, UploadThing and Cloudinary plans and app hosting are outside "free tiers". Get written client approval (change order). |
| 8.1 | Partner attorney availability | Client | Not verifiable | EXTERNAL | As 6.2. |

### Section 9: Acceptance criteria

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 9.1 | Deliverables meet described content and format, and pass client UAT within 5 business days | Process | No UAT plan or UAT sign-off found | MISSING | Send a UAT pack (see RELEASE_READINESS.md Part 3). Many deliverables do not match the described format (Notion/Forms/Airtable versus custom app). |
| 9.2 | Pilot matters processed end to end with documented approvals and no blocking defects | Process + app | No pilot record. Open High defects D-1 and D-3, plus the new facility-page leak (RELEASE_READINESS.md) | MISSING | Fix the High defects, then run the pilot. |
| 9.3 | Policies approved by client (and ethics counsel if engaged) | Process | Policy pages still marked DRAFT | MISSING | Get written approval. Remove DRAFT banners only after approval. |

### Section 10: Service levels (stabilization)

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 10.1 | 60-day support window post go-live | Process | No go-live date. No runbook | MISSING | Set the go-live date. Write a support runbook. |
| 10.2 | Response times P1 under 4 business hours, P2 under 1 day, P3 under 2 days | Process | No severity definitions, on-call contact or alerting found. No error monitoring in dependencies (`package.json`: no Sentry or similar) | MISSING | Define P1 to P3, name owners, add error alerting. |
| 10.3 | Weekly status cadence and issue log with ETA and owner | Process | No issue log in repo. GitHub issues not checked | EXTERNAL | Provide the tracker link. |

### Section 11: Security and compliance

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 11.1a | Least-privilege access | `permissions.ts`, `middleware.ts`, per-route checks | Three roles. 18 permissions. `tests/unit/permissions.test.ts` passes. Members cannot reach moderation or admin APIs. But see the notes below the table | PARTIAL | (1) MODERATOR can mark any user, including ADMINs, as "access reviewed" (`src/app/api/admin/access-review/route.ts:82`). (2) The role comes from the 7-day JWT, so a demotion takes up to 7 days (KNOWN_ISSUES "Open, other" 4). (3) Public endpoints still expose emails (RELEASE_READINESS.md S-2, S-3). |
| 11.1b | Quarterly permission audit | Access review page + API | `src/app/api/admin/access-review/route.ts:27-35` lists users not reviewed in 90 days. `POST` sets `lastReviewedAt` only (line 97) | PARTIAL | (1) Records no reviewer, no decision, no notes, so it is not an audit record. (2) The page is broken for MODERATORs: `src/middleware.ts:47-53` returns 403 on `/api/admin/*` unless the role has `manage_users` (ADMIN only), but the route and page are meant for moderators too. Tests call the handler directly and do not catch this. (3) Only covers app users, not Notion, Drive or Stripe access. No completed audit report exists. |
| 11.1c | Enforce MFA where available | Login flow | `src/app/api/auth/login/route.ts:75-94` always issues an email OTP and only an `mfa-pending` cookie. `src/app/api/auth/verify/route.ts:83` is the only place that sets `auth-token`. `src/lib/jwt.ts:44` rejects mfa-pending tokens as sessions | DONE | MFA is required for every role (MEMBER, MODERATOR, ADMIN), with no opt-out and no bypass code found. It protects every route that requires login, because no session exists without it. The factor is email OTP only (no TOTP or passkey). Weakness: the 6-digit code is stored in plain text in `MfaOtp.code` (`src/services/mfa.service.ts:118-121`). MFA for the external tools (Notion, Drive, Stripe dashboard) cannot be checked here: EXTERNAL. |
| 11.2a | "FOR ATTORNEY REVIEW ONLY" watermark on drafts | Watermark service | `pdf-watermark.service.ts:14` text is "PUBLIC REDACTED VERSION". Fixed text, no user or org (`tests/integration/watermark.test.ts:120`, `it.fails`). Never called by the app. Not wired to approval on this branch (`grep watermark src/services/moderation.service.ts`: no hits). Open defects D-3, D-4, D-5, D-6, D-7 | MISSING | The SOW mark is not implemented. What exists is a different mark for published copies, and it is unused. Draft PDFs uploaded with a rebuttal are stored and later shown publicly with no mark at all (RELEASE_READINESS.md S-1). Fix: add a draft watermark on upload and keep "PUBLIC REDACTED VERSION" for published copies. The CH-48 branch wires watermarking to approval but is not merged. |
| 11.2b | Versioning standards | Not found | See 3E.4 | MISSING | Edits overwrite drafts. |
| 11.3a | No PHI | Redaction checkbox only | `src/app/actions/rebuttals.ts:57-59` requires a "redactionAcknowledged" tick. No content scanning. See the field inventory below | PARTIAL | The app collects free text and documents that can contain PHI. The only control is member attestation plus moderator review (`docs/moderation-sop.md` Stage 2). |
| 11.3b | Limit PII collection | Field inventory | See the field inventory below | PARTIAL | Mostly minimal. Extra PII: the print form adds the signer's name and visit date into the rebuttal body, which is published on approval (`src/app/dashboard/forms/rebuttal/RebuttalPrintForm.tsx:86`). IP addresses and user agents are stored. Emails are logged to server logs (`src/lib/mailer.ts:33`, `src/services/mfa.service.ts:137`, `src/app/api/moderation/route.ts:221`). |
| 11.3c | Encrypted storage | Third-party providers | Postgres, UploadThing and Cloudinary. No app-level encryption of files or fields | PARTIAL | Encryption at rest depends on the providers and the DB host. Not verifiable from code. Rebuttal documents are uploaded to Cloudinary with default (public) delivery (`rebuttals.ts:30`). Member files use UploadThing URLs (`uploadthing.ts:44`). Anyone holding the URL can fetch the file without logging in. |
| 11.3d | Secure sharing policies | Share links | Token: `randomBytes(32)` (`files/share/route.ts:78`). Revocation returns 410 (`share/[token]/route.ts:45-47`). Expiry returns 410 (lines 50-52). Access logged (lines 100-110) | PARTIAL | Options are 7 days, 30 days or NEVER. An unrecognised expiry value silently creates a never-expiring link (A-1, `tests/integration/files.test.ts:407`). Revoking a link does not revoke the raw storage URLs it already handed out. No written sharing policy document. |
| 11.3e | Password storage | bcrypt | `src/lib/auth-utils.ts:7` (`bcrypt.hash(password, 10)`). Minimum length 8 (`signup/route.ts:26`) | DONE | Acceptable. Cost 10 is the bcrypt default. Consider 12. |
| 11.4 | Supervision and outsourcing policies aligned to ABA MR 5.3; CA rule alignment noted | Not found | See 3B.1 | MISSING | Write and have counsel review. |

#### 11.3 field inventory (everything the app stores)

Source: `prisma/schema.prisma` on this branch, plus forms in `src/app/**`.

| Model or form | Fields | PHI or extra PII concern |
|---|---|---|
| User | name, email, password hash, role, organizationId, lastReviewedAt, failedLoginAttempts, lockedUntil (last two unused) | None beyond what login needs |
| Organization | name | None |
| Membership | plan, status, Stripe customer and subscription ids, dates, canceledAt (unused) | None. No card data stored (Stripe Checkout) |
| Facility | name, address, facilityNumber, city, county, capacity, ccldLink, description, createdById, organizationId | Public licensing data. Claimant identity is exposed by email (S-2) |
| Rebuttal | title, content (free text), documentUrl (any file, Cloudinary), watermarkedUrl, status | **Free text and attachments can contain resident names, diagnoses and medication details.** Published to the public on approval. Highest PHI risk in the system |
| RebuttalPrintForm (feeds Rebuttal.content) | dateOfVisit, citationNumber, signature (typed name), date | Signer name and visit date are written into public content (`RebuttalPrintForm.tsx:86`). Unnecessary for publication |
| Rebuttal form drafts | stored in browser `localStorage` key `rebuttal_form_draft` | Unredacted drafts persist on shared or office computers |
| CitationDeadline | citationId, dueDate, notes (free text) | Notes can contain PHI. Private to the member |
| MemberFile | filename, fileKey, fileUrl, size, type, label, isQsfDoc | Files can be anything (inspection reports, records). Private, but URL-accessible without login |
| FileShareLink, FileShareAccessLog | token, expiry, revokedAt; ipAddress, userAgent of the person opening the link | IP and user agent of attorneys. Acceptable for an audit log, but should be in the privacy notice |
| TakedownRequest | requesterName, requesterEmail, facilityOrRebuttal, reason, reasonDetails, supportingInfo (free text) | Public form. Free text can contain PHI. Reason `PRIVACY_PII_PHI` exists |
| ConsentLog (unused) | signedName, email, ipAddress, userAgent, documentUrl, documentPublicId | Model only. Nothing writes it |
| MfaOtp | email, 6-digit code (plain text), attempts, used | Codes should be hashed |
| LoginAttempt | email (as typed, including unknown emails), ipAddress | Stores attempted emails of non-users. Pruned only on the next failed login after 24 hours idle |
| ProcessedStripeEvent | Stripe event id, type | None |
| Volunteer form | name, email, phone, city/state, background, message | Not stored. Opens the user's mail client (`VolunteerSection.tsx:49-67`) |
| Google Analytics | page views, cookies | Loaded unconditionally when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (`src/app/layout.tsx:29-30`). No consent banner found |

#### 3E audit trail: what is logged and what is not

There is **no general `AuditLog` model** (confirmed in `prisma/schema.prisma`). The logs that exist:

| Action | Logged? | Where |
|---|---|---|
| Rebuttal moderation (approve, reject, request fix) | Yes. Who, from status, to status, notes, when | `ModerationLog` via `src/services/moderation.service.ts:19` |
| Emergency takedown unpublish | Yes, as a ModerationLog row | `src/services/takedown.service.ts:411` |
| Moderation log archival after 1 year | Yes, copied to `ArchivedModerationLog` | `moderation.service.ts:146` |
| Share link opened | Yes. Link, time, IP, user agent (fire-and-forget) | `src/app/api/share/[token]/route.ts:100-110` |
| Template downloaded | Yes. User, template, time | `src/services/template.service.ts:90` |
| Stripe webhook received | Event id and type only (for deduplication, not an audit trail) | `src/app/api/stripe/webhook/route.ts:39` |
| Takedown resolved, assigned | Only as current-state columns (`resolvedById`, `assignedToId`), not a history | `TakedownRequest` |
| Login success | **No** | Only `LoginAttempt` failure counters, deleted on success (`login/route.ts:73`) |
| Login failure | Counter only, no history | `LoginAttempt` |
| Logout | **No** | |
| Signup | **No** (only `User.createdAt`) | |
| Facility claim or create | **No** (only `Facility.createdById`, overwritten never, and no timestamp of the claim) | |
| Rebuttal submitted or edited | **No** (`createdAt` and `updatedAt` only; edits overwrite) | |
| Share link created or revoked | Current state only (`createdAt`, `revokedAt`) | |
| Member file upload or delete | Current state only (`uploadedAt`, `deletedAt`); a `console.log` on upload | `src/lib/uploadthing.ts:52` |
| Billing and plan changes (webhook or admin override) | **No.** Admin override writes a `console.log` only | `src/app/api/membership/update/route.ts:61` |
| Role changes, seat linking (`linkSeatToOrg`) | **No** | |
| Access review | `lastReviewedAt` only, no reviewer | |
| Consent or e-signature | **No** (model unused) | |

### Section 12: Metrics and KPIs

| SOW ref | KPI | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 12.1 | Intake-to-assignment SLA (1 business day or less) | Not measurable | No intake, and rebuttals have no assignee field (`Rebuttal` model). Takedowns do have `assignedToId` but no `assignedAt` | MISSING | Cannot be measured. Needs intake plus an assignment timestamp. |
| 12.2 | Draft turnaround time per matter type | Partly measurable by query | `Rebuttal.createdAt` and the first `ModerationLog.createdAt` with `toStatus = APPROVED`. No matter type field. No report on this branch (analytics on unmerged `origin/CH-34-analytics-dashboard`) | PARTIAL | Measures moderation turnaround, not drafting. No "matter type". |
| 12.3 | Attorney revision cycles per draft (target 2 or fewer) | Proxy only | Count of `ModerationLog` rows with `toStatus = REQUEST_FIX` per rebuttal | PARTIAL | Counts moderator fix requests, not attorney revisions. No report. |
| 12.4 | Defect rate (blocking issues per 10 matters) | Not measurable | No defect or issue tracking in the app | MISSING | Track in the issue log (10.3). |
| 12.5 | Member satisfaction (CSAT after first 5 matters) | Not measurable | No survey, rating or CSAT field (`grep -ri "csat\|satisfaction\|survey" src`: privacy page only) | MISSING | Add a survey (external form is fine). |

### Section 13 and 14

| SOW ref | Requirement | Where it lives | Evidence | Status | Gap or action |
|---|---|---|---|---|---|
| 13 | Material change to scope, tools or timeline needs a written Change Order | Process | No change order found in the repo | MISSING | One is advisable now (see Part 2 and 3). |
| 14 | Commercials in the MSA or Order Form; invoices net 15 | Not in repo | The SOW only refers to the MSA or Order Form. No pricing in the docx | EXTERNAL | Pricing: not stated. Confirm the MSA or Order Form exists and is signed. |

### Annex A: RACI

| SOW ref | Task (Accountable) | Evidence | Status | Gap or action |
|---|---|---|---|---|
| A.1 | Approve policies (Client A) | Policies still DRAFT | MISSING | Get client approval in writing. |
| A.2 | Build web stack (Integrator R/A) | Custom app built. SOW tools not built (3D) | PARTIAL | Change order to accept the custom app. |
| A.3 | Draft LPO SOPs (Integrator R/A; Counsel and Partner Attorney C) | SOPs exist, partly unmerged. No record of counsel or attorney consultation | PARTIAL | Merge CH-28. Record consultation. |
| A.4 | Pilot matters (Partner Attorney A) | No pilot, no attorney named | MISSING | As 5.4. |
| A.5 | Nonprofit filings (Client C/A; Integrator R as PM) | Not in repo | EXTERNAL | Human to confirm. |

### Annex B: Deliverables checklist (sign-off)

| SOW ref | Deliverable | Status | Evidence |
|---|---|---|---|
| B.1 | Discovery Summary | MISSING | Not found on any branch |
| B.2 | Ethics and Compliance Policy Pack | PARTIAL | Disclaimers done. Privacy and Terms DRAFT. Ethics/supervision and conflicts missing |
| B.3 | Governance Pack (bylaws, COI, minutes templates) | MISSING | Not found |
| B.4 | Web Stack (Notion, Forms, CRM, Calendly, SignWell), live links | EXTERNAL | Only a Notion URL found. A custom app was built instead of most tools |
| B.5 | LPO SOPs, QA checklist, versioning guide | PARTIAL | SOPs partly unmerged. No versioning guide. No standalone QA checklist |
| B.6 | Training materials (slides, playbooks, screencasts) | PARTIAL | Playbooks only, partly unmerged. No slides, no screencasts |
| B.7 | Go-live and stabilization reports | MISSING | Template only, unmerged |

### Row count by status

| Status | Rows |
|---|---|
| DONE | 3 |
| PARTIAL | 32 |
| MISSING | 38 |
| EXTERNAL | 16 |
| NOT CODE | 4 |
| **Total** | **93** |

Counted by script across every matrix table above (Sections 2 to 14, Annex A, Annex B). The field inventory and audit-trail tables are supporting detail and are not counted. The three DONE rows are 3B.2d (disclaimers), 11.1c (MFA) and 11.3e (password hashing).

## Part 2: Scope mismatch

### What the SOW describes

A lean, low-cost **tool stack**: Notion KB, Tally/Google Forms, Airtable/Sheets, Calendly, SignWell and Google Drive. Plus **policy, governance, nonprofit formation, training and an attorney-supervised drafting process** run by a PH-based team. The SOW never mentions a custom web application, a database, payments, or a public facility directory.

### Major features in the codebase that the SOW does not mention

1. Custom Next.js 16 application with its own Postgres database (Prisma, 18 migrations).
2. Custom authentication: email and password, mandatory email OTP, login throttling, JWT sessions.
3. **Stripe paid membership tiers** (TIER_A, TIER_B, TIER_C) with Checkout, Billing Portal and webhooks (`src/app/api/stripe/*`).
4. Organizations and multi-seat membership with facility quotas per tier.
5. **Public facility directory** of CCLD-licensed facilities, with search and filters (`src/app/(public)/facilities`).
6. **Facility claiming** by operators, limited by tier.
7. **Rebuttal submission, moderation and public publication** on facility pages.
8. PDF watermarking service ("PUBLIC REDACTED VERSION").
9. Member private file storage (UploadThing) and attorney share links with expiry, revocation and access logs.
10. Template library with download tracking (in-app, not Notion).
11. Citation deadline tracker (`/dashboard/deadlines`).
12. Takedown and incident management with a 72-hour SLA (`/dashboard/incidents`, `TakedownRequest`).
13. Independent provider directory (`/providers`, `/independent-providers`).
14. Admin tools: users, memberships, access review, moderation log archival.
15. Marketing sections: sponsors, volunteer form, "planned AI support" page, membership guide, `sow-guide` page.
16. Google Analytics, Cloudinary, Docker deployment files.

### SOW deliverables that the codebase does not cover

1. Discovery Summary and process maps (PDF).
2. Ethics and supervision policy (ABA MR 5.3), conflicts protocol, final (non-draft) confidentiality and retention policies.
3. Nonprofit governance pack, formation, EIN, 501(c) filings, CA registrations, renewal calendar.
4. Notion knowledge base content (only a link exists).
5. Intake form, helpdesk form, Airtable/Sheets CRM, Calendly, SignWell templates, Google Drive structure.
6. "FOR ATTORNEY REVIEW ONLY" draft watermark and a versioning standard.
7. An attorney role, attorney review gate, signature, filing and close stages.
8. Training slides, screencasts and attendance.
9. Pilot on 2 test matters, go-live report, 60-day stabilization summary, issue log, SLA process.
10. KPI measurement for intake-to-assignment, defect rate and CSAT.

### Does this create a scope or payment risk?

**Yes, a serious one.** SOW 9.1 says deliverables must "meet described content/format". Annex B lists "Web Stack (Notion, Forms, CRM, Calendly, SignWell), live links". The client can reject acceptance because what was built is not what the SOW describes. They could also refuse to pay for features (Stripe tiers, directory, claiming) that the SOW never asked for. SOW 7.2 also assumes free or low-cost tool tiers. The app adds ongoing costs (hosting, Stripe fees, UploadThing, Cloudinary), and SOW 7.2 says upgrades are "out of scope unless approved". SOW 13 requires a written Change Order for "any material change to scope, tools, or timeline". Replacing the tool stack with a custom app is such a change. No change order was found.

**A Change Order is advisable before requesting sign-off.**

## Part 3: Recommended Change Orders and SOW clarifications

1. **CO-1: Replace the SOW web stack with the custom application.** State that the custom app satisfies 3D.2a (membership), part of 3D.5 (member file storage instead of Drive), and part of 3E.5 and 3E.6 (logs and attorney sharing). List the extra features (items 3 to 16 above) as in-scope. Restate the Annex B "Web Stack" acceptance evidence as "production URL plus UAT sign-off". Include fee and schedule impact.
2. **CO-2: Ongoing third-party costs.** Get written client approval for hosting, Stripe, UploadThing, Cloudinary and email sending costs under SOW 7.2.
3. **CO-3: Tools still required.** Decide in writing which of Notion KB, intake form, helpdesk form, Airtable/Sheets, Calendly and SignWell are still delivered, and which are dropped. Intake and e-signature matter most because Milestones 4 to 6, 9.2 and KPI 12.1 depend on them.
4. **CO-4: Watermark wording and purpose.** Agree whether the system must mark drafts "FOR ATTORNEY REVIEW ONLY" (SOW 11.2), mark published copies "PUBLIC REDACTED VERSION" (current code), or both.
5. **CO-5: Attorney-supervised workflow.** Agree whether the app must model attorney review, signature, filing and close, or whether the moderation queue plus an offline attorney process is acceptable.
6. **Clarify Section 3C (nonprofit formation)** as project management only, with government timelines outside the integrator's control (SOW 8.3), so milestone acceptance does not wait on IRS processing.
7. **Clarify 3H (QSF)** as not elected, unless the client says otherwise.
8. **Fill in the blank SOW fields** and get signatures before invoicing (see RELEASE_READINESS.md Part 3).
