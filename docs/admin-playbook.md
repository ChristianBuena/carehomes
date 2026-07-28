# Admin Playbook

## Purpose

This document outlines the standard operating procedures (SOPs) that administrators follow to manage and maintain the platform on a day-to-day basis. It serves as a central reference for administrative workflows, operational responsibilities, and incident response procedures.

## Overview

The Admin Playbook provides administrators with documented processes to ensure operational consistency and efficiency. It includes procedures for member onboarding, content moderation, incident management, access reviews, and emergency response.

> **Status:** Initial draft (Version 0.1)

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

> **Status:** In Progress

### Purpose

This section documents the member onboarding workflow following a successful Stripe Checkout transaction. It also describes the expected manual recovery procedure when the automated Stripe webhook does not complete successfully.

### Standard Onboarding Process

1. The member completes the subscription checkout through Stripe.
2. Stripe sends a `checkout.session.completed` webhook event to the application.
3. The system validates the organization ID and selected pricing plan from the checkout session metadata.
4. The purchased subscription tier is determined (Tier A, Tier B, or Tier C).
5. The system creates or updates the organization's membership record.
6. The membership status is set to **ACTIVE**, and subscription details are stored.
7. A confirmation email is sent to the organization's primary user containing their membership details and dashboard link.
8. If the confirmation email fails to send, the membership remains active and the error is logged for investigation.

### Manual Onboarding (Stripe Webhook Failure)

> **Status:** Pending confirmation

The application automatically activates memberships through the Stripe `checkout.session.completed` webhook.

The manual recovery process for failed webhook events is currently under review and will be documented after confirmation from the implementation team.

**Note:**

Membership activation is fully automated through Stripe webhook events. Administrative intervention is generally not required unless the webhook fails or another exception occurs.


---

## Moderation Process

> **Status:** Draft

This section will describe the moderation workflow, including the review, approval, rejection, and revision request process for submitted content.

---

## LPO Intake and Attorney Handoff

> **Status:** Draft

This section will outline the intake process for Legal Process Outsourcing (LPO) requests and the subsequent handoff to the assigned attorney.

---

## Incident Response

> **Status:** Draft

This section will document the incident response process, including handling content takedown requests, service-level agreements (SLAs), escalation procedures, and incident documentation.

---

## Quarterly Access Review

> **Status:** Draft

This section will describe the quarterly review process for user roles and permissions to ensure appropriate platform access.

---

## Emergency Takedown Procedure

> **Status:** Draft

This section will document the emergency takedown workflow, including immediate response actions, escalation procedures, and communication requirements.

---

## Escalation Contacts

> **Status:** Pending client information

The contact list for operational, legal, and technical escalations will be added after confirmation from the client.

---

## Revision History

| Version | Date | Author | Description |
|----------|------------|--------|-------------|
| 0.1 | 2026-07-20 | Kian Hellie | Initial Admin Playbook structure and section outlines. |