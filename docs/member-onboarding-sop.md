# Member Onboarding Standard Operating Procedure (SOP) & Operator Guide

**Document Version:** 2.0  
**Effective Date:** August 2026  
**Audience:** Licensed Care Facility Operators, Facility Administrators, New Subscribers  
**Platform:** CareHomesSupportDocs.org  

---

## 1. Overview

CareHomesSupportDocs.org is dedicated to empowering licensed California care facility operators (RCFE, ARF, Adult Day Care) to manage their public compliance standing through professional, state-compliant citation rebuttals.

This guide outlines the 5-step guided onboarding workflow that takes a new operator from initial registration to their first published rebuttal.

---

## 2. The 5-Stage Member Onboarding Journey

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     STEP 1      │     │     STEP 2      │     │     STEP 3      │     │     STEP 4      │     │     STEP 5      │
│     Account     │ ──► │   Membership    │ ──► │  Claim Facility │ ──► │ Submit Rebuttal │ ──► │ Moderation &    │
│  Registration   │     │  Subscription   │     │  (Org Scoped)   │     │   & Redaction   │     │ Live Publishing │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

### Step 1: Account Creation & Security Setup
1. **Sign Up:** Navigate to [`/signup`](https://carehomessupportdocs.org/signup) and enter your legal name, organization name, corporate email address, and a secure password.
2. **Organization Creation:** The system automatically establishes your B2B `Organization` record, making you the primary seat owner.
3. **MFA Verification:** Check your email for the 6-digit Multi-Factor Authentication (MFA) code and verify your session.
4. **Consent & Terms:** Review and electronically sign the Membership Terms and Electronic Consent Agreement.

---

### Step 2: Choose a Membership Subscription
To claim care facilities and publish rebuttals, an active subscription tier is required:

| Plan Tier | Monthly / Annual | Facility Capacity | Features |
|---|---|---|---|
| **Tier A (Solo/Small)** | $49/mo | Up to **1 Facility** | 1 Facility Claim, Unlimited Rebuttals, Watermarked PDF generation |
| **Tier B (Multi-Home)** | $129/mo | Up to **5 Facilities** | 5 Facility Claims, Priority Moderation Queue, Template Library |
| **Tier C (Enterprise)** | $249/mo | Up to **10 Facilities** | 10 Facility Claims, Multi-Seat Attorney Access, Dedicated LPO Review |

1. Go to [`/pricing`](https://carehomessupportdocs.org/pricing) or click **Choose Plan** in your dashboard.
2. Complete checkout via Stripe's encrypted payment portal.
3. Upon payment success, your organization's `Membership` status immediately transitions to `ACTIVE`.

---

### Step 3: Search & Claim Your Licensed Facility
1. Go to the **Facility Directory** at [`/facilities`](https://carehomessupportdocs.org/facilities).
2. Search by **Facility Name**, **CCLD Facility Number**, **City**, or **County**.
3. Click on your facility profile and select **Claim Facility**.
4. **Quota Verification:** The system automatically verifies that your organization has available slots within your subscription plan limit (`canClaimFacility`).
5. Once claimed, the facility is linked to your organization and appears in your **My Facilities** dashboard ([`/dashboard/facilities`](https://carehomessupportdocs.org/dashboard/facilities)).

---

### Step 4: Draft, Redact & Submit Your Citation Rebuttal
1. From your dashboard, click **Submit New Rebuttal** ([`/dashboard/rebuttals/new`](https://carehomessupportdocs.org/dashboard/rebuttals/new)).
2. **Select Claimed Facility:** Choose the target facility from your dropdown list.
3. **Rebuttal Title & Content:**
   - State the citation date, Title 22 section referenced, and factual summary.
   - Describe specific corrective actions taken, staff in-service training conducted, and policy updates instituted.
   - Maintain an objective, professional tone. Avoid personal attacks or unsubstantiated claims.
4. **Mandatory Redaction Check:**
   - **Crucial Rule:** You must blackout/redact all resident names, room numbers, DOBs, and non-public medical information.
   - Check the **Redaction Acknowledgment** checkbox.
5. **Supporting Document Upload (Optional):** Attach proof of compliance, revised training logs, or photo evidence (PDF or DOCX).
6. Click **Submit Rebuttal**.

---

### Step 5: Moderation Review & Live Publication
1. Your submission enters the **Moderation Queue** with status `PENDING`.
2. Our Legal Process Outsourcing (LPO) compliance team reviews the submission within **24–48 hours** according to our [Moderation SOP](file:///c:/PROJECT-WEB/carehomes-support-docs/docs/moderation-sop.md).
3. **Outcomes:**
   - **Approved:** Rebuttal immediately goes live on your public facility page with official platform disclaimers.
   - **Fix Required (`REQUEST_FIX`):** You will receive an email and dashboard notification with specific reviewer notes (e.g., "Please redact resident initials on line 14"). You can edit and resubmit directly at [`/dashboard/rebuttals/[id]/edit`](https://carehomessupportdocs.org/dashboard/rebuttals).
   - **Rejected:** If the submission violates fundamental legal or privacy policies.

---

## 3. Dashboard Onboarding Checklist

New operators (< 30 days old) will see an interactive **Onboarding Checklist** at the top of their dashboard ([`/dashboard`](https://carehomessupportdocs.org/dashboard)):

- **Step 1:** Create your account `[Auto-checked]`
- **Step 2:** Choose a membership plan `[Auto-checked when subscription is Active]`
- **Step 3:** Claim your first facility `[Auto-checked when 1st facility is claimed]`
- **Step 4:** Submit your first rebuttal `[Auto-checked when 1st rebuttal is submitted]`

> **Note:** Once all 4 steps are complete, the checklist automatically retires, leaving a clean, streamlined operational dashboard.

---

## 4. Operator Support & Resources
- **Notion Knowledge Base:** [CareHomesSupportDocs Knowledge Base](https://viridian-zenith-231.notion.site/CareHomesSupportDocs-Knowledge-Base-3ae85b445f0d800fa609d4871dcf42cf)
- **Email Support:** `carehomessupport444@gmail.com`
- **Takedown & Emergency Help:** [`/takedown-policy`](https://carehomessupportdocs.org/takedown-policy)
