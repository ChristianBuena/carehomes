# DRAFT - for attorney review

**Data Retention Policy (draft v0.1)**

> Working draft prepared by the project integrator for counsel to review. It is **not legal advice**. Retention periods are left as **[to be agreed]** on purpose: choosing them needs legal input. The "What the system does today" column is a factual description of the code on branch `release-blockers` (2026-10-31) so that counsel can see the gap between policy and practice.

Related SOW items: 3B.2 (data retention), 11.3 (no PHI, limit PII), Annex B "Ethics & Compliance Policy Pack". Public-facing summary: `src/app/(public)/privacy/page.tsx` section 6 (currently marked DRAFT).

## 1. Principles (draft)

1. Collect the minimum needed. No PHI (SOW 11.3).
2. Keep data only as long as needed for the purpose it was collected for, or as required by law.
3. Delete or anonymize when the period ends, and record that it was done.
4. Legal holds override deletion. **[Counsel to define]** the hold process.

## 2. Retention schedule

| Data (model in `prisma/schema.prisma`) | Purpose | Proposed period | What the system does today |
|---|---|---|---|
| User account (name, email, password hash, role) | Login, membership | [to be agreed] after account closure | Kept until deleted by an admin. No account-closure or deletion feature found |
| Organization and Membership (plan, status, Stripe ids) | Billing, quota | [to be agreed]; tax records may need longer **[Counsel / accountant to confirm]** | Kept indefinitely. Card data is held by Stripe, not the app |
| Facility (public licensing data, claimant) | Public directory | While listed | Soft-deleted (`deletedAt`), never removed |
| Rebuttal text and document | Publication after moderation | [to be agreed] | Soft-deleted only. Documents stay in Cloudinary; no deletion job |
| ModerationLog / ArchivedModerationLog | Audit trail | [to be agreed] | Moved to the archive table after 1 year (`archiveOldModerationLogs`); archive kept indefinitely |
| MemberFile (private uploads) | Member storage, attorney sharing | [to be agreed] after membership ends | Soft-deleted in the database; the file itself stays at UploadThing. No cleanup job |
| FileShareLink, FileShareAccessLog (IP, user agent) | Attorney sharing audit | [to be agreed] | Kept indefinitely |
| TakedownRequest (requester name, email, details) | Takedown handling | [to be agreed] | Kept indefinitely |
| CitationDeadline (notes) | Member reminders | Until the member deletes it, or [to be agreed] | Kept until deleted |
| MfaOtp (one-time codes) | Login second factor | Minutes | Replaced on each new code; expired codes are not swept by a job |
| LoginAttempt (typed email, IP) | Login throttling | 24 hours | Rows idle for 24 hours are deleted on the next failed login only |
| ProcessedStripeEvent (event id) | Webhook deduplication | [to be agreed], e.g. 30 to 90 days | Kept indefinitely; no cleanup job |
| ConsentLog (signed name, email, IP) | E-signature record | [to be agreed] | Model exists, nothing writes to it |
| Server logs | Debugging | [to be agreed] | Some log lines contain user email addresses (see docs/RELEASE_READINESS.md S-25) |
| Backups | Recovery | [to be agreed] | No backup procedure is documented yet (MIGRATION_RUNBOOK.md covers a pre-migration backup only) |
| Browser `localStorage` draft (`rebuttal_form_draft`) | Unsent form draft | Until submit | Cleared on successful submit; otherwise stays on that device |

## 3. Deletion requests (draft)

1. A member or third party asks for deletion through **[contact channel to be agreed]**.
2. The program lead checks identity, any legal hold and any retention duty. **[Counsel to confirm]**
3. Deletion or anonymization is carried out in the database **and** at the storage providers (Cloudinary, UploadThing), and the request is logged.
4. The requester is told the outcome within **[to be agreed]** days.

The takedown process for public content stays separate (`/takedown-policy`, 72-hour target).

## 4. Gaps this policy exposes (for the implementation plan, not legal questions)

- No account deletion or anonymization feature.
- No scheduled cleanup jobs (OTP codes, LoginAttempt, ProcessedStripeEvent, soft-deleted files and documents).
- Deleting a record in the app does not delete the stored file at Cloudinary or UploadThing.
- No documented backup schedule or backup retention.

## 5. Review

- Owner: [to be agreed]
- Approved by: [name and date, to be completed]

## Open questions for counsel

1. What retention periods apply to member, billing, moderation and takedown records?
2. Are there record-keeping duties tied to the supervising attorneys' files that override this schedule?
3. Which cross-border transfer requirements apply to data handled by the Philippines-based team?
4. What must the public privacy notice say once the periods are agreed?
