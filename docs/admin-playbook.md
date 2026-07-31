# Admin Playbook

## Purpose

This document outlines the standard operating procedures (SOPs) that administrators follow to manage and maintain the platform on a day-to-day basis. It serves as a central reference for administrative workflows, operational responsibilities, and incident response procedures.

## Overview

The Admin Playbook provides administrators with documented processes to ensure operational consistency and efficiency. It includes procedures for member onboarding, content moderation, incident management, access reviews, and emergency response.

> **Status:** Draft (Version 0.2)

---

## Table of Contents

- [Onboarding New Members](#onboarding-new-members)
- [Moderation Process](#moderation-process)
- [LPO Intake and Attorney Handoff](#lpo-intake-and-attorney-handoff)
- [Incident Response](#incident-response)
- [Quarterly Access Review](#quarterly-access-review)
- [Emergency Takedown Procedure](#emergency-takedown-procedure)
- [Escalation Contacts](#escalation-contacts)
- [Revision History](#revision-history)

---

## Onboarding New Members

### Purpose

This section documents the standard member onboarding workflow following a successful Stripe Checkout transaction. It also defines the manual recovery procedure to be followed when the automated Stripe webhook fails to complete the membership activation process.

### Standard Onboarding Process

Membership onboarding is fully automated through Stripe webhooks.

1. The member completes the subscription checkout through Stripe.
2. Stripe sends the `checkout.session.completed` webhook event to the application.
3. The application validates the organization ID (`orgId`) and selected pricing plan (`priceId`) from the checkout session metadata.
4. The application determines the purchased membership tier (Tier A, Tier B, or Tier C).
5. The organization's membership record is created or updated.
6. The membership status is set to **ACTIVE**, and the following subscription information is stored:
   - Membership plan
   - Maximum facility allocation
   - Stripe Customer ID
   - Stripe Subscription ID
7. A membership confirmation email is sent to the organization's primary user with their membership details and a link to the dashboard.
8. If the confirmation email cannot be delivered, the membership remains active and the email failure is recorded in the application logs for later investigation.

### Manual Onboarding (Stripe Webhook Failure)

Although membership activation is fully automated, administrators may perform a manual recovery when the `checkout.session.completed` webhook cannot be processed successfully.

#### Manual Recovery Procedure

1. Verify in the Stripe Dashboard that the customer's payment was successfully completed.
2. Review the application logs to confirm that the webhook failed or did not complete successfully.
3. Retrieve the following information from the Stripe Checkout Session:
   - Organization ID (`orgId`)
   - Stripe Price ID (`priceId`)
   - Stripe Customer ID
   - Stripe Subscription ID
4. Determine the correct membership tier based on the Stripe Price ID.
5. Create or update the organization's membership record with:
   - Membership status set to **ACTIVE**
   - Selected membership plan
   - Maximum facility allocation for the selected tier
   - Stripe Customer ID
   - Stripe Subscription ID
6. Verify that the organization's membership has been activated successfully.
7. Confirm that the member has received the membership confirmation email. If necessary, resend the confirmation email manually.
8. Record the incident and the recovery actions in the operational log for auditing purposes.

### Operational Notes

- Membership activation is designed to occur automatically through the Stripe `checkout.session.completed` webhook.
- Manual onboarding should only be performed when automatic webhook processing fails or another exceptional condition prevents membership activation.
- Failure to send the confirmation email does **not** prevent the membership from becoming active.
- All webhook processing failures should be investigated using the application logs before manual recovery is performed.

---

## Moderation Process

### Purpose
This section documents the moderation workflow for facility rebuttals. Authorized administrators and moderators review submitted rebuttals before they become publicly available.

### Standard Moderation Workflow

1. The administrator signs in to the platform.
2. The system verifies that the user has permission to access the moderation dashboard.
3. The moderation dashboard displays all rebuttals with a **PENDING** status.
4. Pending rebuttals are listed in chronological order, with the oldest submissions reviewed first.
5. Each rebuttal displays the following information:
   - Member name
   - Member email
   - Facility name
   - Facility number
6. The administrator reviews the rebuttal and selects one of the available moderation actions:
   - **Approve** – Accepts the rebuttal.
   - **Reject** – Rejects the rebuttal.
   - **Request Fix** – Returns the rebuttal to the member for revision.
7. The system verifies that the administrator has permission to perform the selected action before processing the request.
8. If **Request Fix** is selected, the member is notified to update and resubmit the rebuttal.

### Access Requirements

- Users must be authenticated before accessing the moderation dashboard.
- Only users with the appropriate moderation permissions may access the moderation queue.
- Individual moderation actions require their corresponding permissions.

**Note:**

If there are no pending rebuttals, the moderation dashboard displays a message indicating that all submissions have been reviewed.
---

## LPO Intake and Attorney Handoff

> **Status:** Pending Implementation

This section will document the workflow for Legal Process Outsourcing (LPO) requests, including the intake process, administrative review, and attorney handoff.

### Current Status

At the time of writing, an LPO intake and attorney handoff workflow has not been identified within the current application codebase.

Detailed operational procedures will be added once the feature has been implemented and the business process has been confirmed by the project stakeholders.

**Note:**

This section is reserved to satisfy the operational documentation requirements and will be updated in a future revision of the Admin Playbook.

---

## Incident Response

> **Status:** In Progress

### Purpose

This section documents the administrative process for handling takedown requests involving published content that may violate privacy, redaction, or platform policies.

### Standard Incident Response Workflow

1. A takedown request is received through the designated moderation contact email.
2. The administrator acknowledges receipt of the request.
3. The administrator reviews the reported content against the platform's Redaction Policy and the original public CCLD citation.
4. The administrator determines whether the reported content violates platform policies.
5. A decision is made within the organization's target response window of **72 hours**.
6. If the content violates policy, the content is removed or temporarily suspended until appropriate corrections are made.
7. The requester and the facility operator are notified of the outcome.

### Emergency Incidents

For severe privacy or security incidents involving exposed sensitive information (such as Personally Identifiable Information (PII) or Protected Health Information (PHI)), administrators may perform an emergency takedown before the standard review process is completed to reduce potential harm.

### Incident Logging

All takedown requests, actions taken, and related communications should be recorded in the internal incident log for legal, compliance, and auditing purposes.

**Note:**

The target response time for incident handling is **72 hours**. Emergency takedown actions may be performed immediately when significant privacy risks are identified.

---

## Quarterly Access Review

> **Status:** In Progress

### Purpose

This section documents the quarterly access review process to ensure that user roles and permissions remain appropriate and comply with organizational security policies.

### Review Criteria

The application automatically identifies user accounts requiring a quarterly access review based on the following conditions:

- The user has never completed an access review (`lastReviewedAt` is `null`).
- The user's most recent access review was completed more than **90 days** ago.

Users meeting either condition are included in the quarterly access review count displayed on the Moderation Dashboard.

### Quarterly Access Review Process

1. Navigate to the **Moderation Dashboard**.
2. Review the number of user accounts identified as requiring an access review.
3. Open the **Access Review** page from the dashboard.
4. Verify that each user's assigned role and permissions are appropriate for their current responsibilities.
5. Update user access as required in accordance with the organization's access control policies.

### Operational Notes

- The application automatically calculates quarterly review requirements using each user's `lastReviewedAt` timestamp.
- The Moderation Dashboard provides administrators with visibility into the number of users requiring review.
- Detailed audit procedures and review completion workflows will be documented as additional access review functionality is implemented.
---

## Emergency Takedown Procedure

> **Status:** In Progress

### Purpose

This section documents the administrative procedure for responding to emergency takedown requests involving sensitive or protected information published on the platform.

### Emergency Takedown Workflow

1. An emergency takedown request is received by the moderation team.
2. The request is reviewed to determine whether it involves a severe privacy or compliance issue.
3. If the request involves the exposure of sensitive information (such as protected personal or medical information), the affected content should be removed or temporarily disabled immediately while the investigation continues.
4. The moderation team documents the incident and records the actions taken.
5. The affected facility or member is notified of the takedown action when appropriate.
6. A full review is completed in accordance with the platform's takedown policy and response procedures.

### Escalation

The internal contact escalation path for emergency takedown requests will be documented after confirmation from the client.

**Note:**

Emergency takedown procedures are reserved for situations involving significant privacy, legal, or compliance risks. Standard takedown requests continue to follow the normal review process and target response timeline.
---

## Escalation Contacts

> **Status:** Pending Client Information

### Purpose

This section lists the primary contacts responsible for operational, technical, legal, and emergency escalations. It should be reviewed and kept up to date whenever contact information changes.

| Escalation Type | Primary Contact | Secondary Contact | Contact Method | Notes |
|-----------------|-----------------|-------------------|----------------|-------|
| Platform Support | Pending | Pending | Pending | Technical platform issues |
| Moderation | Pending | Pending | Pending | Content review and moderation concerns |
| Legal / Compliance | Pending | Pending | Pending | Legal requests, compliance matters, and takedown reviews |
| Billing / Membership | Pending | Pending | Pending | Subscription and Stripe-related issues |
| Emergency Takedown | Pending | Pending | Pending | Urgent privacy or legal incidents |

### Escalation Guidelines

- Follow the appropriate operational procedure before escalating an issue.
- Document all escalations in the incident log when applicable.
- Emergency privacy or legal incidents should be escalated immediately after the initial assessment.
- Contact information should be verified during each quarterly access review or whenever organizational changes occur.

**Note:**

The contact names, email addresses, phone numbers, and escalation order will be added after confirmation from the client.
---

## Revision History

| Version | Date | Author | Description |
|----------|------------|--------|-------------|
| 0.1 | 2026-07-20 | Kian Hellie | Created the initial Admin Playbook structure and section outlines. |
| 0.2 | 2026-07-31 | Kian Hellie | Expanded the playbook with documented operational procedures for onboarding, moderation, incident response, quarterly access reviews, emergency takedown, and escalation guidance. LPO Intake and Attorney Handoff remains pending implementation. |