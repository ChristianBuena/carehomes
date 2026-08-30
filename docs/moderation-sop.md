# Moderation Standard Operating Procedure (SOP) & LPO Review Guidelines

**Document Version:** 2.0  
**Effective Date:** August 2026  
**Applicability:** Admin & Moderator Roles, Legal Process Outsourcing (LPO) Reviewers, Legal Counsel  
**Entity:** CareHomesSupportDocs.org  

---

## 1. Purpose & Core Principles

CareHomesSupportDocs.org is a nonprofit membership platform that enables licensed California care facilities to publish factual, compliant rebuttals to California Department of Social Services / Community Care Licensing Division (CCLD) citations.

The moderation team serves as the compliance gatekeeper. Every rebuttal submitted by an operator must be thoroughly vetted before publication to ensure:

1. **Resident Privacy & Redaction Compliance:** Absolute zero tolerance for Resident Personally Identifiable Information (PII) or Protected Health Information (PHI).
2. **Neutrality & Factual Tone:** Rebuttals must provide constructive, factual context without defamatory, speculative, or unprofessional rhetoric.
3. **Legal Non-Admission Standards:** Rebuttals should contextualize corrective actions without making damaging legal admissions of civil liability.
4. **CCLD & Disclaimer Compliance:** Clear distinction that CareHomesSupportDocs.org is not a government agency and does not provide legal advice.

---

## 2. Rebuttal Lifecycle & State Machine

```
              ┌───────────────┐
              │    SUBMIT     │
              └───────┬───────┘
                      │
                      ▼
               [ PENDING ] ◄────────────────┐
                      │                     │
          ┌───────────┼───────────┐         │ (Resubmitted)
          │           │           │         │
          ▼           ▼           ▼         │
    [ APPROVED ] [ REJECTED ] [ REQUEST_FIX ]
```

### Status Definitions
| Status | Meaning | Public Visibility | Action Required |
|---|---|---|---|
| `PENDING` | Newly submitted or edited rebuttal waiting for moderator review | **Hidden** | Moderator reviews within SLA |
| `APPROVED` | Verified and approved by moderator | **Live on Public Facility Page** | Published with disclaimer |
| `REQUEST_FIX` | Returned to operator with specific redaction or factual change requests | **Hidden** | Operator must update and resubmit |
| `REJECTED` | Irreparably non-compliant or fraudulent submission | **Permanently Hidden** | Final decision with logged reason |

---

## 3. The 4-Stage LPO (Legal Process Outsourcing) Review Process

Every pending rebuttal must undergo the 4-Stage LPO Review Protocol prior to status modification.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     STAGE 1     │     │     STAGE 2     │     │     STAGE 3     │     │     STAGE 4     │
│    Intake &     │ ──► │  PII / PHI &    │ ──► │   Evidence &    │ ──► │ Factual Tone &  │
│ Facility Check  │     │ Redaction Audit │     │ Watermark Check │     │ LPO Legal Guard │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Stage 1: Intake & Facility Ownership Verification
- Verify the submitting user is an active `MEMBER` belonging to an organization in good standing.
- Confirm the rebuttal is linked to a valid, claimed `Facility` record owned by that organization.
- Confirm the citation date and title correspond to an authentic CCLD inspection report or citation number.

### Stage 2: Mandatory PII / PHI & Redaction Audit (Zero Tolerance)
Moderators must scrutinize all text fields and attached PDF/DOCX documentation for prohibited identifiers:
- **Prohibited Identifiers:**
  - Full names of residents, family members, or ombudsmen.
  - Resident room numbers, bed assignments, admission dates, or birthdates.
  - Specific medical diagnoses, medication logs, or health condition narratives not already in the public citation.
  - Staff names (unless strictly acting in official licensee capacity).
- **Rule:** If any unredacted PII/PHI is found, the submission must **immediately** be set to `REQUEST_FIX` or `REJECTED`. It can **never** be approved.

### Stage 3: Evidentiary Documentation & Watermark Verification
- If a supporting document was uploaded (via Cloudinary):
  - Check that the document is legible, clean, and directly supports the rebuttal.
  - Confirm the document URL is valid and watermarked with the compliance stamp.
  - Ensure the document does not contain hidden metadata or unredacted PDF layers.

### Stage 4: Substantive Factual Tone & LPO Legal Guard
Review the written rebuttal content against standard legal defense guidelines:
- **Tone:** Professional, objective, and solution-oriented.
- **Language:**
  - *Acceptable:* "Facility implemented revised staff training protocols on August 12 to ensure 100% compliance with Title 22 Section 87411."
  - *Unacceptable:* "The inspector was biased and lied about our staff."
  - *Unacceptable:* "We admit we neglected the resident because we were short-staffed."
- Verify that standard disclaimers ("Published for informational transparency; not legal advice or official CCLD endorsement") will automatically accompany the published record.

---

## 4. Decision Rubric & Response Templates

When setting status to `REQUEST_FIX` or `REJECTED`, moderators must provide clear, professional guidance in the moderation notes.

### Template: Redaction Fix Required (`REQUEST_FIX`)
> "Thank you for submitting your rebuttal. During compliance review, unredacted resident identifiers (e.g., resident name or room number in Paragraph 2 / attached PDF Page 1) were detected. Under California resident privacy standards, all resident-identifying information must be completely blacked out or removed. Please edit your rebuttal, upload the fully redacted document, and resubmit for immediate review."

### Template: Tone / Non-Admission Fix Required (`REQUEST_FIX`)
> "Your rebuttal draft contains emotive assertions regarding inspection staff rather than objective factual clarifications. Please rephrase your response to focus on specific operational corrections, training updates, and verifiable compliance steps taken by your facility."

### Template: Final Rejection (`REJECTED`)
> "This submission cannot be published because it violates platform compliance standards (unauthorized facility claiming / persistent refusal to redact sensitive resident medical records). If you believe this decision was made in error, please contact compliance@carehomessupportdocs.org."

---

## 5. Audit Trail & Status History

All moderation actions are recorded permanently in PostgreSQL via Prisma:

```prisma
model ModerationLog {
  id          String         @id @default(cuid())
  fromStatus  RebuttalStatus
  toStatus    RebuttalStatus
  notes       String?
  createdAt   DateTime       @default(now())
  moderatorId String
  rebuttalId  String
}
```

### Audit Rules
1. **Immutable Logging:** Every transition (`PENDING` → `APPROVED`, `PENDING` → `REQUEST_FIX`, `PENDING` → `REJECTED`) automatically creates a `ModerationLog` record capturing the timestamp, moderator user ID, prior status, new status, and reviewer notes.
2. **Archival Lifecycle:** Logs older than 1 year (365 days) are moved to `ArchivedModerationLog` via the automated transaction pipeline (`archiveOldModerationLogs()`), maintaining audit compliance while preserving operational database performance.
3. **No Unrecorded Actions:** Moderators cannot modify rebuttal text directly; changes must be made by the submitting operator via the `REQUEST_FIX` workflow.

---

## 6. SLAs & Escalation Procedures

| Queue Item | Standard SLA | Maximum SLA | Escalation Target |
|---|---|---|---|
| New Rebuttal Review (`PENDING`) | 24 Hours | 48 Hours | Lead Compliance Moderator |
| Resubmitted Rebuttal (`REQUEST_FIX` → `PENDING`) | 12 Hours | 24 Hours | Lead Compliance Moderator |
| 72-Hour Takedown Request (`TakedownRequest`) | 24 Hours | 72 Hours | Compliance Counsel & Executive Admin |
| Emergency PII Leak Incident | 1 Hour | 4 Hours | System Admin (Instant Emergency Unpublish) |

### Emergency Takedown Protocol
If a published rebuttal is reported for containing accidental resident PII or infringing material:
1. Locate the rebuttal in the Moderation Queue or Admin Takedown dashboard (`/dashboard/moderation`).
2. Trigger the **Emergency Unpublish** action (`softDeleteRebuttal` or set `status: REJECTED`).
3. Notify the submitting operator and assign ticket number to the legal response file.
4. Complete the formal resolution log within the mandatory 72-hour statutory window.
