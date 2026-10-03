import type { Metadata } from "next";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { buildMetadata } from "@/lib/metadata";
import { CheckSquare } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "SOW Review & Membership Guide — CareHomesSupportDocs.org",
  description:
    "Companion guidance for the revised Statement of Work (SOW). Plain-language explanation of membership framework, review process, and approval checklist.",
});

/* ---------- Data ---------- */

const PLAIN_LANGUAGE_ITEMS = [
  {
    title: "Website baseline and current-state definition",
    body: "The SOW should clearly identify what exists today on the Care Home Support Docs website and what does not. Existing informational pages, branding, and public-facing content should not be treated as proof that a working membership platform, payment system, private document library, or member dashboard has already been completed.",
  },
  {
    title: "Branding and visual continuity",
    body: "The developer should preserve the approved brand direction, including the shield-style logo, color palette, typography, navigation approach, and overall page structure unless a written change is approved.",
  },
  {
    title: "Membership architecture",
    body: "The SOW should treat the $300, $400, and $500 levels as distinct membership offerings. Each tier should have a written list of included benefits, access permissions, limits, and any recurring or one-time payment terms.",
  },
  {
    title: "Authentication and member access",
    body: "If members will log in, the SOW should require secure registration, login, password reset, session controls, and role-based access so that members only see content and features allowed for their tier.",
  },
  {
    title: "Payment processing",
    body: "The payment feature should identify the payment processor, checkout flow, successful/failed payment handling, refund or cancellation rules, receipts, and the process for activating or suspending member access.",
  },
  {
    title: "Document upload and library features",
    body: "If users or administrators can upload documents, the SOW should define permitted file types, file-size limits, storage, naming, access controls, deletion rules, malware/security precautions, and who owns uploaded files.",
  },
  {
    title: "Moderation and directory functions",
    body: "Any member directory, posting area, comments, or community content should include moderation permissions, acceptable-use rules, removal procedures, and an administrator workflow.",
  },
  {
    title: "Security, privacy, and accessibility",
    body: "The SOW should require reasonable security controls, privacy protections, backups, least-privilege access, and accessibility practices appropriate for the website and its users.",
  },
  {
    title: "Content safeguards",
    body: "The site should distinguish educational/support materials from legal, medical, licensing, or professional advice where appropriate. Disclaimers and review procedures should be included for high-risk content.",
  },
  {
    title: "Milestones and acceptance",
    body: "Each major deliverable should have a measurable acceptance standard. Completion should be based on demonstrated functionality and documented evidence — not simply a statement that a page or feature has been built.",
  },
  {
    title: "Ownership and account control",
    body: "The client should own or control the domain, hosting, payment account, analytics, administrative credentials, source files, original design assets, and data, subject to any clearly disclosed third-party license terms.",
  },
  {
    title: "Launch and stabilization",
    body: "The SOW should include launch responsibilities plus a defined stabilization period (such as 60 days) for fixing launch-related defects, monitoring core functions, and handing off documentation.",
  },
  {
    title: "Change control",
    body: "Any material change to scope, price, schedule, or functionality should be documented in writing and approved before extra work begins.",
  },
];

const REVIEW_STEPS = [
  "Confirm the baseline: Compare the SOW against the current website and mark every feature as Existing, To Be Modified, New Build, Third-Party Integration, or Out of Scope.",
  "Confirm tier benefits: Approve a written benefit matrix for the $300, $400, and $500 tiers. Avoid vague phrases such as \"premium access\" unless the exact benefits are listed.",
  "Confirm technical dependencies: Identify hosting, domain/DNS, payment processor, email service, storage, authentication provider, analytics, security tools, and any subscription costs.",
  "Confirm data and content responsibility: State who supplies text, forms, graphics, directories, downloadable files, policies, and member records, and who is responsible for reviewing them before publication.",
  "Confirm milestones: Attach target dates, dependencies, responsible parties, and acceptance tests to each milestone.",
  "Confirm acceptance evidence: Require screenshots, test credentials, working demonstrations, transaction tests, upload/download tests, role-access tests, and a final punch-list closeout where applicable.",
  "Confirm legal/compliance review: Have counsel review terms involving ownership, privacy, refunds, disclaimers, liability, confidentiality, regulated information, and dispute resolution.",
  "Confirm launch-readiness checklist: Before launch, verify backups, SSL, admin access, payment tests, mobile display, forms, email notifications, privacy/terms links, accessibility checks, and recovery procedures.",
  "Confirm handoff: Require delivery of credentials, source files, documentation, vendor lists, licenses, backups, and instructions needed to operate the site without dependence on one contractor.",
  "Execute and control changes: Sign the final SOW only after exhibits and assumptions are complete. Use written change orders for later additions or deletions.",
];

const CHECKLIST_ITEMS = [
  "Current website baseline is accurately described.",
  "All existing versus future functionality is clearly separated.",
  "$300, $400, and $500 membership benefits are defined in writing.",
  "Pricing frequency (one-time, monthly, annual, or other) is explicitly stated.",
  "Authentication and member-role requirements are documented.",
  "Payment, refund, cancellation, renewal, and failed payment handling are documented.",
  "Document upload/download permissions and storage rules are documented.",
  "Admin/moderation capabilities are documented.",
  "Privacy, security, backup, and accessibility requirements are documented.",
  "Content disclaimers and review responsibilities are documented.",
  "Each milestone has measurable acceptance criteria.",
  "Client ownership/control of accounts, credentials, source files, assets, and data is stated.",
  "Third-party tools, fees, licenses, and limitations are disclosed.",
  "Launch support and 60-day stabilization responsibilities are stated.",
  "Change order procedures are included.",
  "Termination, dispute, payment, confidentiality, and legal-review provisions are complete.",
  "Final exhibits, screenshots, wireframes, or feature matrices are attached or incorporated by reference.",
  "Authorized client and vendor representatives have signed and dated the final SOW.",
];

interface TierRow {
  area: string;
  tier300: string;
  tier400: string;
  tier500: string;
}

const TIER_MATRIX: TierRow[] = [
  {
    area: "Positioning",
    tier300: "Core membership / essential access",
    tier400: "Enhanced membership / expanded access",
    tier500: "Top-tier membership / fullest approved access",
  },
  {
    area: "Member account",
    tier300: "Included",
    tier400: "Included",
    tier500: "Included",
  },
  {
    area: "Protected member content",
    tier300: "Core library",
    tier400: "Core + expanded library",
    tier500: "Full approved set",
  },
  {
    area: "Downloads / forms",
    tier300: "Defined core set",
    tier400: "Expanded set",
    tier500: "Full approved set",
  },
  {
    area: "Directory or profile features",
    tier300: "Basic, if offered",
    tier400: "Enhanced, if offered",
    tier500: "Priority/expanded, if offered",
  },
  {
    area: "Support / assistance",
    tier300: "Standard level",
    tier400: "Enhanced level",
    tier500: "Highest approved level",
  },
  {
    area: "Events / training / resources",
    tier300: "Core access as specified",
    tier400: "Expanded access as specified",
    tier500: "Full/priority access as specified",
  },
  {
    area: "Special features",
    tier300: "Only those expressly listed",
    tier400: "Includes mid-tier additions",
    tier500: "Includes top-tier additions expressly listed",
  },
  {
    area: "Usage limits",
    tier300: "Must be defined",
    tier400: "Must be defined",
    tier500: "Must be defined",
  },
  {
    area: "Renewal / term",
    tier300: "Must be defined",
    tier400: "Must be defined",
    tier500: "Must be defined",
  },
];

const ACCEPTANCE_EVIDENCE = [
  {
    title: "Registration/login",
    body: "Successful account creation, email verification if required, password reset, login/logout, invalid-login handling.",
  },
  {
    title: "Tier permissions",
    body: "Test accounts for each tier showing allowed and blocked content.",
  },
  {
    title: "Payments",
    body: "Sandbox or approved live test showing successful charge, failed payment, receipt/confirmation, and correct membership activation.",
  },
  {
    title: "Document library",
    body: "Upload, list, search/filter if included, download, permission enforcement, delete/archive behavior, and admin management.",
  },
  {
    title: "Directory/community",
    body: "Create/edit profile or post, moderation/admin removal, privacy settings, and permissions.",
  },
  {
    title: "Responsive design",
    body: "Desktop, tablet, and mobile review of core pages and member functions.",
  },
  {
    title: "Security/privacy",
    body: "HTTPS, secure admin access, privacy links, appropriate access controls, backups, and credential handoff.",
  },
  {
    title: "Handoff",
    body: "Client confirms receipt and control of domain/hosting/admin/payment/analytics credentials, source files, documentation, and backups.",
  },
];

/* ---------- Component ---------- */

export default function SowGuidePage() {
  return (
    <div className="py-12 md:py-20 bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl">
        <div className="p-6 sm:p-10 md:p-14 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl space-y-14">

          {/* Page Header */}
          <header className="space-y-4 text-center">
            <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] block">
              Care Home Support Docs
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]">
              SOW Review, Approval &amp; Membership Guide
            </h1>
            <p className="text-sm text-[var(--color-muted)] italic">
              Companion guidance for the revised Statement of Work (SOW)
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Prepared for business and implementation review | September 2026
            </p>
          </header>

          {/* Purpose & Important Note */}
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                <strong>Purpose and use.</strong> This document explains the revised SOW in plain language, provides a practical review-and-approval process, and summarizes the proposed $300 / $400 / $500 membership framework. It is intended to help the client, developer, designer, vendors, and legal counsel confirm exactly what is included before work proceeds.
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 space-y-2">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                <strong>Important note.</strong> This is business and implementation guidance, not legal advice. A qualified attorney should review the final SOW, privacy terms, payment terms, ownership provisions, and any regulated-content or membership obligations before execution.
              </p>
            </div>
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Section 1: Plain-Language Explanation */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              1. Plain-Language Explanation of the Revised SOW Guidance
            </h2>

            <ul className="space-y-5" role="list">
              {PLAIN_LANGUAGE_ITEMS.map((item) => (
                <li key={item.title} className="space-y-1">
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    {item.title}:
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pl-0 sm:pl-4">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 2: Review and Approval Process */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              2. Review and Approval Process
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              Use the following process before signing or authorizing development work:
            </p>

            <ol className="space-y-4" role="list">
              {REVIEW_STEPS.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-bold text-[var(--color-primary)] shrink-0 text-sm min-w-[1.75rem]">
                    {idx + 1}.
                  </span>
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 3: SOW Approval Checklist */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              3. SOW Approval Checklist
            </h2>

            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckSquare
                    className="h-4 w-4 text-[var(--color-muted)] mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 4: Proposed Membership Framework Summary */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              4. Proposed Membership Framework Summary
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              The following matrix is a practical SOW drafting framework. The final benefit descriptions should match the business model actually approved by the client.
            </p>

            {/* Responsive Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[var(--color-primary)] text-white">
                    <th className="px-4 py-3 font-bold whitespace-nowrap">Feature Area</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">$300 Tier</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">$400 Tier</th>
                    <th className="px-4 py-3 font-bold whitespace-nowrap">$500 Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_MATRIX.map((row, idx) => (
                    <tr
                      key={row.area}
                      className={
                        idx % 2 === 0
                          ? "bg-[var(--color-surface)]"
                          : "bg-[var(--color-bg)]"
                      }
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--color-text)] whitespace-nowrap">
                        {row.area}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{row.tier300}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{row.tier400}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)]">{row.tier500}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Critical drafting rule */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 space-y-2">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                <strong className="text-[var(--color-danger)]">Critical drafting rule:</strong>{" "}
                Do not assume that the higher tier automatically includes every lower-tier feature unless the SOW explicitly says so. The final SOW should state whether benefits are cumulative and should identify exclusions, usage limits, and any benefits delivered by third parties.
              </p>
            </div>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 5: Recommended Acceptance Evidence by Feature */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              5. Recommended Acceptance Evidence by Feature
            </h2>

            <ul className="space-y-4" role="list">
              {ACCEPTANCE_EVIDENCE.map((item) => (
                <li key={item.title} className="flex items-start gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                    <strong className="text-[var(--color-text)]">{item.title}:</strong>{" "}
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 6: Suggested Approval Sign-Off */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              6. Suggested Approval Sign-Off
            </h2>
            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              The parties may use the following internal sign-off before formal execution of the final SOW.
            </p>

            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-6">
              {/* Signature Lines */}
              {[
                "Client representative",
                "Developer/vendor representative",
                "Legal review completed by (if applicable)",
              ].map((label) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-8">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-[var(--color-text)]">{label}:</p>
                    <div className="h-px bg-[var(--color-border)] w-full" />
                  </div>
                  <div className="space-y-1 sm:w-40">
                    <p className="text-xs font-bold text-[var(--color-text)]">Date:</p>
                    <div className="h-px bg-[var(--color-border)] w-full" />
                  </div>
                </div>
              ))}

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--color-text)]">Approved SOW version/date:</p>
                  <div className="h-px bg-[var(--color-border)] w-full" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[var(--color-text)]">Approved exhibits/attachments:</p>
                  <div className="h-px bg-[var(--color-border)] w-full" />
                </div>
              </div>
            </div>

            {/* Final reminder */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 space-y-2">
              <p className="text-sm text-[var(--color-text)] leading-relaxed">
                <strong className="text-[var(--color-danger)]">Final reminder:</strong>{" "}
                The signed SOW should be the controlling source for scope, deliverables, pricing, acceptance, ownership, and change management. Marketing copy, informal messages, or mockups should not override the signed SOW unless incorporated by reference or approved through the change-control process.
              </p>
            </div>
          </section>

        </div>
      </ResponsiveContainer>
    </div>
  );
}
