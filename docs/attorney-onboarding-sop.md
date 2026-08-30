# Attorney & Legal Counsel Onboarding SOP

**Document Version:** 2.0  
**Effective Date:** August 2026  
**Audience:** Healthcare Defense Counsel, Regulatory Attorneys, Facility In-House Counsel, Compliance Officers  
**Platform:** CareHomesSupportDocs.org  

---

## 1. Executive Summary

CareHomesSupportDocs.org provides a specialized collaboration framework for healthcare defense attorneys representing licensed California residential care facilities (RCFEs, ARFs, and Skilled Nursing).

This SOP establishes the legal onboarding workflow, document access parameters, redline review protocols, and approval workflows required when counseling facility operators through citation rebuttals and public transparency filings.

---

## 2. The Attorney Onboarding & Collaboration Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     PHASE 1     │     │     PHASE 2     │     │     PHASE 3     │     │     PHASE 4     │
│  Registration & │ ──► │ Controlled Doc  │ ──► │    Redline &    │ ──► │ Final Sign-Off  │
│  Org Seat Link  │     │ & Facility View │     │ Factual Defense │     │  & LPO Release  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

### Phase 1: Registration & Multi-Seat Organization Linkage
1. **User Account Creation:** The attorney or legal representative registers at [`/signup`](https://carehomessupportdocs.org/signup) using their professional law firm or corporate counsel email.
2. **Organization Invitation / Seat Link:**
   - The primary facility operator invites counsel to their B2B `Organization` via multi-seat licensing.
   - The attorney's `userId` is linked to the client's `organizationId`, granting access to all facilities claimed under that membership plan.
3. **MFA Verification:** Attorney accounts require mandatory Multi-Factor Authentication on every new session.

---

### Phase 2: Controlled Document & Facility Record Access
Upon organization linkage, counsel has privileged access to:
- **Claimed Facility Compliance Portfolios:** Full view of all CCLD citation records, historical inspection report links, and previous rebuttals.
- **Template Library:** Access to standardized defense checklists, Title 22 compliance outlines, and redaction guidance sheets.
- **Citation Deadlines:** Shared deadline calendar tracking statutory 10-day and 30-day appeal windows for CCLD citations.

---

### Phase 3: Redline, Draft Review & Collaboration Cycle
Attorneys collaborate with facility administrators to prepare rebuttals that achieve public transparency without jeopardizing ongoing administrative appeals or civil defense.

```
       [ Operator Drafts Rebuttal ]
                    │
                    ▼
     [ Attorney Redline & Legal Audit ]
         ├── 1. Non-Admission Check (No civil fault admissions)
         ├── 2. Title 22 Corrective Measure Alignment
         └── 3. Strict Resident PII / PHI Redaction Audit
                    │
                    ▼
   [ Operator Updates Text & Evidentiary PDFs ]
                    │
                    ▼
     [ Attorney Approves for Submission ]
```

#### Core Legal Review Guardrails
1. **No Civil Liability Admissions:**
   - *Prohibited:* Statements acknowledging negligence, reckless conduct, or statutory fault.
   - *Mandatory Standard:* Focus strictly on corrective action plans, policy updates, staff retraining, and evidentiary clarification.
2. **Preservation of Administrative Appeal Rights:**
   - Rebuttals published on CareHomesSupportDocs.org must explicitly reserve all administrative review rights before the CCLD Centralized Appeals Unit.
3. **Zero-PII HIPAA & Privacy Shield:**
   - Counsel must ensure that all resident medical records, names, birthdates, room numbers, and identifying traits in attached exhibits are fully redacted in compliance with California Confidentiality of Medical Information Act (CMIA) and HIPAA standards.

---

### Phase 4: Final Sign-Off & Submission for LPO Moderation
1. When the rebuttal draft and exhibits meet legal defense criteria, counsel authorizes the operator to submit.
2. The submission enters the platform's LPO Moderation Queue with status `PENDING`.
3. If the moderation team issues a `REQUEST_FIX` notice, counsel can review the moderator notes, adjust the redactions or phrasing, and approve the updated draft for expedited resubmission.
4. Once approved by moderation, the rebuttal goes live with standard legal disclaimers stating that the content is provided for public informational transparency and does not constitute formal legal advice.

---

## 3. Takedown & Incident Escalation Protocols

In the event of an urgent regulatory dispute, court protective order, or inadvertent disclosure:
- Counsel can file an **Expedited 72-Hour Takedown Request** at [`/takedown-policy`](https://carehomessupportdocs.org/takedown-policy) or via API.
- For emergency resident privacy breaches, counsel may request an immediate **Emergency Unpublish** (`emergencyUnpublishedAt`), which instantly hides the public rebuttal while formal review takes place.

---

## 4. Summary of Key Legal Disclaimers
Every attorney onboarding to the platform must acknowledge:
- CareHomesSupportDocs.org is a private, nonprofit transparency platform and is **not affiliated with the State of California or the CCLD**.
- Communications on the platform do not automatically create an attorney-client relationship with other platform members.
- Public rebuttal publication does not substitute for filing formal statutory appeals with the California Department of Social Services.
