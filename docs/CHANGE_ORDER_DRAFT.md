# Change Order (DRAFT)

Factual draft under SOW Section 13 ("Any material change to scope, tools, or timeline requires a written Change Order with impact on schedule and fees"). It lists what was built, what was delivered differently, and what was not delivered. It does not set prices, dates or obligations. Every commercial or legal term is left as **[to be agreed]**.

| Field | Value |
|---|---|
| SOW | Statement of Work, Nonprofit Support Center + Attorney-Supervised LPO Build (Single Integrator), file dated 21 JUN 2026 |
| SOW ID | [to be agreed] (blank in the SOW) |
| Client | [to be agreed] (blank in the SOW) |
| Integrator | [to be agreed] (blank in the SOW) |
| Change Order number | [to be agreed] |
| Date | [to be agreed] |
| Source of facts | `docs/SOW_GAP_ANALYSIS.md`, `docs/RELEASE_READINESS.md`, branch `release-blockers` |

## A. Built, but not described in the SOW

The SOW describes a web tool stack (Notion, Tally/Google Forms, Airtable/Sheets, Calendly, SignWell, Google Drive). Instead, or in addition, a custom web application was built:

| # | Feature | Where it lives |
|---|---|---|
| A1 | Custom Next.js web application with its own PostgreSQL database (18 migrations) | `src/`, `prisma/` |
| A2 | Accounts with email + password and a mandatory email one-time code (MFA) for every role; login throttling | `src/app/api/auth/*`, `src/services/mfa.service.ts`, `src/services/login-throttle.service.ts` |
| A3 | Paid membership tiers (TIER_A / B / C) through Stripe Checkout, Billing Portal and webhooks | `src/app/api/stripe/*` |
| A4 | Organizations with multiple seats sharing one membership and facility quota | `Organization` model; `src/app/actions/linkSeatToOrg.ts` |
| A5 | Public directory of licensed California care facilities with search and filters | `src/app/(public)/facilities` |
| A6 | Facility claiming by operators, limited by tier | `src/app/actions/claimFacility.ts`, `POST /api/facility` |
| A7 | Rebuttal submission, moderation (approve / reject / request fix) and publication of approved rebuttal text on facility pages | `src/app/dashboard/rebuttals`, `src/app/api/moderation`, `src/services/moderation.service.ts` |
| A8 | Private member file storage and time-limited, revocable attorney share links with an access log | `src/app/api/files/*`, `src/app/api/share/[token]`, `src/app/share/[token]` |
| A9 | In-app template library with download tracking (members only) | `src/app/dashboard/library`, `src/app/dashboard/templates`, `src/app/api/templates/*` |
| A10 | Citation deadline tracker | `src/app/dashboard/deadlines` |
| A11 | Takedown and incident management with a 72-hour target | `src/app/dashboard/incidents`, `TakedownRequest` model |
| A12 | Independent provider directory | `src/app/(public)/providers`, `src/app/(public)/independent-providers` |
| A13 | Admin tools: users, memberships, 90-day access review, moderation log archival | `src/app/dashboard/users`, `memberships`, `moderation/access-review` |
| A14 | Public marketing and information pages (membership guide, pricing, how it works, planned AI support, volunteer form) | `src/app/(public)/*` |
| A15 | Hosting artifacts and third-party services: Docker files, Google Analytics, Cloudinary, UploadThing, Gmail SMTP | `Dockerfile`, `docker-compose.yml`, `src/app/layout.tsx`, `src/lib/*` |

Fee and schedule impact of A1 to A15: **[to be agreed]**.
Ongoing third-party costs these features add (hosting, Stripe fees, UploadThing, Cloudinary, email), which SOW 7.2 treats as out of scope unless approved: **[to be agreed]**.

## B. SOW items delivered through a different tool than the SOW states

| # | SOW reference | SOW states | Delivered as | Status of delivery |
|---|---|---|---|---|
| B1 | 3D.2, 4.5 (membership form) | Tally or Google Forms | App signup + Stripe Checkout (A2, A3) | Built |
| B2 | 3D.2 (auto-log to Airtable or Sheets), 4.5 (CRM base) | Airtable or Sheets | App database (PostgreSQL) and admin pages | Built for membership, facilities and rebuttals; no intake or helpdesk data |
| B3 | 3D.5 (file storage with least privilege) | Google Drive | UploadThing (member files) and Cloudinary (rebuttal documents) | Built. Storage URLs are reachable by anyone holding the URL (RELEASE_READINESS.md S-12) |
| B4 | 3E.5 (audit trail) | Activity logs (tool not specified) | Moderation log, share-link access log, template download log | Partial: login, claims, billing and role changes are not logged |
| B5 | 3E.6 (secure channel for attorney feedback) | Not specified (Drive sharing implied) | Read-only attorney share links (A8) | Partial: no way for the attorney to send feedback through the app |
| B6 | 2.1, 3D.1 (downloadable templates) | Public Notion knowledge base | In-app library for members (A9) plus a link to a Notion page | Library built; Notion content not verified |
| B7 | 2.2, 3E.3 (QA gates) | Attorney-supervised drafting pipeline | Moderator review queue (A7) | Partial: no attorney role in the app |

Client acceptance of each substitution: **[to be agreed]**.

## C. SOW items not delivered, or proposed to be deferred or dropped

| # | SOW reference | Item | Current state | Proposed treatment |
|---|---|---|---|---|
| C1 | 3E.2, 11.2 | "FOR ATTORNEY REVIEW ONLY" watermark on drafts | Not implemented. The app has an unused "PUBLIC REDACTED VERSION" stamp. Public pages show approved rebuttal **text only**; documents are not public (release decision 0c) | Release decision 0b: out of scope for the web application, because drafting happens outside the app. The mark is applied to drafts in the drafting tool under the LPO SOP. **[to be agreed]** |
| C2 | 3D.2 | Intake form | Not built | [to be agreed]: external form (Tally/Google Forms) or app feature |
| C3 | 3D.2 | Helpdesk form | Contact page with email links only | [to be agreed] |
| C4 | 3D.3 | Calendly page | Not found | [to be agreed] |
| C5 | 3D.4 | SignWell e-signature templates | Not built. An in-app consent flow exists on an unmerged branch (`origin/CH-40-electronics-consent`) and has not been reviewed | [to be agreed] |
| C6 | 3A.1, 5.1, Annex B | Discovery Summary | Not found | [to be agreed] |
| C7 | 3B, 4.2, 11.4 | Ethics/supervision policy (ABA MR 5.3), conflicts protocol, data retention policy | First drafts in `docs/policies/`, marked DRAFT for attorney review | Counsel review **[to be agreed]** |
| C8 | 3C, 4.3 | Nonprofit formation, filings, governance pack, renewal calendar | Not in the repository | [to be agreed]; government timelines are outside integrator control (SOW 8.3) |
| C9 | 3E.4, 11.2 | Naming and versioning standard | Not written | [to be agreed] |
| C10 | 3F.3, 4.7 | Training slides and 5 to 7 screencasts | Plan only (`docs/training/screencast-plan.md`) | [to be agreed] |
| C11 | 3G, 4.8, 5.6, 5.7 | Go-live, soft launch with 3 to 5 intakes, 60-day stabilization report | Not started (templates in `docs/training/`) | Timeline **[to be agreed]** |
| C12 | 5.4, 9.2 | Pilot on 2 test matters with partner attorney approvals | Not started | [to be agreed]; requires named partner attorneys (SOW 6, 8.1) |
| C13 | 12.1, 12.4, 12.5 | KPIs: intake-to-assignment, defect rate, CSAT | Not measurable today | [to be agreed] |
| C14 | 3H | §468B QSF coordination (optional) | Not elected as far as the repository shows | Confirm not elected **[to be agreed]** |

## D. Acceptance evidence to replace in Annex B and Section 5

| Item | SOW evidence | Proposed evidence |
|---|---|---|
| Web Stack MVP (Milestone 3, Annex B) | Notion / Forms / CRM live links | [to be agreed], e.g. production URL + client UAT sign-off + live links for any external tools kept |

## E. Impact

| | Value |
|---|---|
| Fee impact | [to be agreed] |
| Schedule impact | [to be agreed] |
| Ongoing cost responsibility | [to be agreed] |

## Signatures

| Party | Name / title | Signature | Date |
|---|---|---|---|
| Client | [to be agreed] | | |
| Integrator | [to be agreed] | | |
