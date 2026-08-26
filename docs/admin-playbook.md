# Administrator Playbook & Operational Guidelines

**Document Version:** 2.0  
**Effective Date:** August 2026  
**Audience:** Platform Superadmins, Support Leads, Operations Managers  
**Platform:** CareHomesSupportDocs.org  

---

## 1. Overview & Administrator Responsibilities

The Administrator Playbook outlines operational workflows, moderation oversight, user account lifecycle management, quarterly access reviews, and data retention procedures for CareHomesSupportDocs.org.

---

## 2. Platform Standard Operating Procedures (SOPs)

All operational teams must adhere to the following dedicated SOPs:

1. **[Moderation SOP & LPO Review Guidelines](file:///c:/PROJECT-WEB/carehomes-support-docs/docs/moderation-sop.md)**
   - 4-Stage LPO Review (Intake, Redaction, Evidence, Tone).
   - State machine lifecycle (`PENDING` → `APPROVED` / `REQUEST_FIX` / `REJECTED`).
   - Moderation SLAs (24-48h queue, 72h takedowns).
   - Immutable audit logging in `ModerationLog`.

2. **[Member Onboarding SOP & Operator Guide](file:///c:/PROJECT-WEB/carehomes-support-docs/docs/member-onboarding-sop.md)**
   - 5-stage member journey (Registration → Subscription → Claim Facility → Rebuttal → Publication).
   - Automated interactive onboarding checklist in the member dashboard.
   - Quota rules by membership tier.

3. **[Attorney & Legal Counsel Onboarding SOP](file:///c:/PROJECT-WEB/carehomes-support-docs/docs/attorney-onboarding-sop.md)**
   - Multi-seat B2B organization linking for counsel.
   - Redline collaboration and non-admission legal guidelines.
   - Expedited incident response and takedown escalation.

4. **[Schema Decisions & Scalability Architecture](file:///c:/PROJECT-WEB/carehomes-support-docs/docs/schema-decisions.md)**
   - Composite indexing strategy with `deletedAt` for high-volume public searches.
   - Non-destructive soft-delete lifecycle.
   - 1-year moderation log archival to `ArchivedModerationLog`.

---

## 3. Routine Operations & Maintenance Routines

### A. Daily Queue Oversight
- Check `/dashboard/moderation` for any pending rebuttals approaching 24-hour turnaround.
- Ensure all moderator decisions include descriptive, constructive notes for operators.

### B. Quarterly Access Review (90-Day Cycle)
- Under platform compliance standards, all privileged accounts (`ADMIN` and `MODERATOR`) must undergo a mandatory quarterly access review.
- Access the quarterly review endpoint or dashboard to confirm active administrative credentials and refresh `lastReviewedAt` timestamps.

### C. Monthly Moderation Log Archiving
- Run the automated archival endpoint to offload logs older than 1 year (365 days) from `ModerationLog` to `ArchivedModerationLog`:
  ```http
  POST /api/admin/archive-moderation-logs
  ```
- This keeps the operational `ModerationLog` table lean and fast while maintaining permanent audit compliance records.

---

## 4. Takedown Request & Incident Management

When a formal takedown request is submitted:
1. Review the request details in the Admin Takedown Queue or database.
2. If the request alleges active PII/PHI or defamation, immediately execute an **Emergency Unpublish** (`isEmergencyTakedown: true`).
3. Communicate with all affected parties and resolve the ticket within the statutory **72-Hour SLA**.
4. Log resolution notes and assign the resolving admin ID to the record.
