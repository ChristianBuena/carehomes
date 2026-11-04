# Handover Checklist (SOW Annex B)

State as of branch `release-blockers`, 2026-10-31. "Owner" is who must act next: **me** (the integrator), **client**, **partner attorney**, or **external tool** (a live link someone must provide and the client must check).

Status key: **ready** = can be handed over now; **needs work** = exists but incomplete or unapproved; **not started** = nothing found.

| # | Annex B deliverable | Status | Evidence | What is still needed | Owner |
|---|---|---|---|---|---|
| 1 | Discovery Summary | not started | Not found on any branch | Write it from the interviews; client signs (Milestone 1 evidence) | me (write), client (sign) |
| 2 | Ethics & Compliance Policy Pack | needs work | Disclaimers live site-wide (`GlobalFooter.tsx`, `DisclaimerBanner.tsx`, `/disclaimer`). Privacy and Terms are marked DRAFT (`src/app/(public)/privacy/page.tsx`, `terms/page.tsx`). New drafts: `docs/policies/ethics-supervision-policy.md`, `conflicts-protocol.md`, `data-retention-policy.md` | Counsel review of all policies; client approval (SOW 9.3); remove DRAFT banners only after approval; export to Word/PDF (SOW 4.2) | partner attorney / ethics counsel (review), client (approve), me (revise and export) |
| 3 | Governance Pack (bylaws, COI, minutes templates) | not started | Not in the repository | Produce, or collect from the formation specialist | me (coordinate), client (accountable for filings, RACI) |
| 4 | Web Stack (Notion, Forms, CRM, Calendly, SignWell), live links | needs work | Custom app built instead of most tools (`docs/CHANGE_ORDER_DRAFT.md` A and B). Notion KB link configured by `NEXT_PUBLIC_NOTION_KB_URL`. No Forms, Airtable, Calendly or SignWell link found | Sign the change order; provide live links for every external tool that stays in scope; client UAT on the production URL after the release blockers are closed | me (change order, links), client (sign, UAT), external tool (Notion, Forms, Calendly, SignWell) |
| 5 | LPO SOPs + QA Checklist + Versioning Guide | needs work | `docs/lpo-workflow-sop.md` (merged from CH-28), `docs/attorney-onboarding-sop.md`, `docs/moderation-sop.md`, `docs/member-onboarding-sop.md` | Standalone QA checklist; naming/versioning guide; partner attorney consultation (RACI "C"); export to Word/PDF; pilot on 2 test matters (Milestone 4) | me (write), partner attorney (review, run pilot) |
| 6 | Training Materials (slides, playbooks, screencasts) | needs work | Playbooks: `docs/admin-playbook.md` and `docs/training/*` (merged from CH-32: attorney workflow, incident response, member onboarding, moderation process, onboarding agenda, screencast plan) | Slides; 5 to 7 screencasts and their links; post materials to the knowledge base; attendance record (Milestone 5) | me (produce, deliver sessions), client (attend), external tool (knowledge base hosting) |
| 7 | Go-Live & Stabilization Reports | not started | Templates only: `docs/training/go-live-stabilization.md`, `docs/training/week14-stabilization-summary.md` ("Template ... pending") | Go live; process the first real matters; run the 60-day stabilization with issue log and weekly status; write both reports | me, client |

## Before anything is handed over

- [ ] Release blockers closed or accepted: `docs/RELEASE_READINESS.md`
- [ ] Pending migrations applied to production: `docs/MIGRATION_RUNBOOK.md`
- [ ] Secrets rotated where needed: `docs/SECRET_ROTATION.md`
- [ ] Change order signed: `docs/CHANGE_ORDER_DRAFT.md`
- [ ] Blank SOW fields completed and the SOW signed (client, integrator, effective date, SOW ID, term, contacts, signatures)
- [ ] MSA or Order Form with pricing confirmed and signed (pricing is not stated in the SOW)
- [ ] Partner attorneys named (SOW 6, 8.1)

## Client acceptance steps (SOW 7.1, 9)

1. Client reviews each submitted deliverable within 3 business days (SOW 7.1).
2. Client UAT within 5 business days of submission (SOW 9.1).
3. Pilot matters processed end to end with documented approvals and no blocking defects (SOW 9.2).
4. Policies approved by the client, and by ethics counsel if engaged (SOW 9.3).
5. Invoices net 15 days unless otherwise agreed (SOW 14.3); amounts per the MSA or Order Form (not stated in the SOW).
