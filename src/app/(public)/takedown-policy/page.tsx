import type { Metadata } from "next";
import { TableOfContents } from "@/components/ui/table-of-contents";
import { Clock, Calendar, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TakedownRequestForm } from "@/components/takedown/TakedownRequestForm";

import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export const metadata: Metadata = buildMetadata({
  title: "Takedown Policy",
  description:
    "Learn how to submit a takedown request for content published on CareHomesSupportDocs.org that violates our privacy or redaction policies.",
});

const TOC_ITEMS = [
  { id: "overview", label: "1. Overview" },
  { id: "who-can-submit", label: "2. Who Can Submit a Request" },
  { id: "grounds-for-takedown", label: "3. Grounds for Takedown" },
  { id: "how-to-submit", label: "4. Submit a Request" },
  { id: "review-process", label: "5. Our Review Process" },
  { id: "appeals-process", label: "6. Appeals Process" },
  { id: "emergency-takedown", label: "7. Emergency Takedown" },
  { id: "incident-log", label: "8. Incident Log" },
];

export default function TakedownPolicyPage() {
  const lastUpdated = "June 15, 2026"; // Hardcoded for now

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Takedown Policy",
    description:
      "Learn how to submit a takedown request for content published on CareHomesSupportDocs.org.",
    publisher: {
      "@type": "Organization",
      name: "CareHomesSupportDocs.org",
    },
    dateModified: new Date(lastUpdated).toISOString(),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="bg-[var(--color-bg)] min-h-screen pb-24">
        {/* Page Header */}
        <header className="bg-[var(--color-primary)] text-[var(--color-surface)] py-12 md:py-16 lg:py-24 border-b border-[var(--color-border)]">
          <ResponsiveContainer>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              Takedown Policy
            </h1>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center text-[var(--color-surface)]/80">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Last Updated: {lastUpdated}
                </span>
              </div>
            </div>
          </ResponsiveContainer>
        </header>

        {/* Prominent Callouts */}
        <ResponsiveContainer className="mt-8 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg shadow-sm flex flex-col justify-center">
              <div className="flex items-start gap-4 mb-4">
                <Clock className="h-6 w-6 text-[var(--color-blue-600)] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[var(--color-primary)] text-lg mb-1">
                    72-Hour Response Target
                  </h3>
                  <p className="text-[var(--color-text)] font-medium">
                    We target a{" "}
                    <strong className="text-[var(--color-blue-600)]">
                      72-hour response
                    </strong>{" "}
                    for all takedown and privacy requests.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg shadow-sm flex flex-col justify-center items-start sm:items-center sm:flex-row sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-[var(--color-primary)] text-lg mb-1">
                  Need immediate action?
                </h3>
                <p className="text-[var(--color-muted)] text-sm">
                  Submit a formal request directly through our compliance system.
                </p>
              </div>
              <Button
                asChild
                className="bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-surface)] shadow-sm shrink-0"
              >
                <a href="#how-to-submit">
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Submit Request Online
                </a>
              </Button>
            </div>
          </div>
        </ResponsiveContainer>

        <ResponsiveContainer>
          <div className="flex flex-col lg:flex-row gap-12 relative">
            {/* TOC Sidebar - Desktop Only */}
            <aside className="hidden lg:block w-64 shrink-0">
              <TableOfContents items={TOC_ITEMS} />
            </aside>

            {/* Main Content */}
            <main className="flex-1 max-w-prose">
              <div className="prose text-lg prose-slate prose-headings:text-[var(--color-primary)] prose-a:text-[var(--color-secondary)] prose-a:font-semibold hover:prose-a:text-[var(--color-primary)] prose-p:leading-relaxed prose-li:leading-relaxed break-words">
                <section id="overview" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">1. Overview</h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    CareHomesSupportDocs.org is committed to ensuring that all
                    published rebuttals adhere strictly to our privacy and
                    redaction guidelines. If you believe that content published
                    on our platform violates your privacy, exposes sensitive
                    information, or violates our terms, you have the right to
                    request its removal.
                  </p>
                  <p className="text-[var(--color-text)] text-lg">
                    We take these requests seriously and target a 72-hour
                    response time for all submitted takedown requests.
                  </p>
                </section>

                <section id="who-can-submit" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                    2. Who Can Submit a Request
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    A takedown request may be submitted by:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-[var(--color-text)] text-lg">
                    <li>
                      Any individual whose personal privacy may be affected by
                      the published content (e.g., a resident, family member, or
                      staff member).
                    </li>
                    <li>
                      A legally authorized representative of an affected
                      individual.
                    </li>
                    <li>
                      A regulatory official or representative from the
                      California Department of Social Services (CCLD).
                    </li>
                    <li>
                      The facility operator who originally posted the rebuttal
                      (if they discover an accidental privacy breach).
                    </li>
                  </ul>
                </section>

                <section
                  id="grounds-for-takedown"
                  className="scroll-mt-28 mb-12"
                >
                  <h2 className="text-3xl font-bold mb-4">
                    3. Grounds for Takedown
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    Content may be removed from CareHomesSupportDocs.org for any
                    of the following reasons:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-[var(--color-text)] text-lg">
                    <li>
                      <strong>Privacy Exposure:</strong> Unredacted resident
                      names, Protected Health Information (PHI), or Personally
                      Identifiable Information (PII) are exposed.
                    </li>
                    <li>
                      <strong>Inaccurate Information:</strong> Demonstrably
                      false statements regarding a resident, family, or staff
                      member.
                    </li>
                    <li>
                      <strong>Defamation or Harassment:</strong> Language that
                      constitutes harassment, threats, or defamation.
                    </li>
                    <li>
                      <strong>Court Order:</strong> A valid legal order
                      requiring the removal of the content.
                    </li>
                    <li>
                      <strong>Policy Violation:</strong> Any other explicit
                      violation of our Redaction Policy or Terms of Service.
                    </li>
                  </ul>
                </section>

                <section id="how-to-submit" className="scroll-mt-28 mb-14">
                  <h2 className="text-3xl font-bold mb-4">
                    4. Submit a Formal Takedown Request
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-6">
                    To request the removal of published content that violates our privacy or redaction policies, please complete the form below. Each submission is immediately assigned an immutable reference ticket and queued for <strong>72-hour SLA review</strong>.
                  </p>
                  
                  <div className="not-prose my-6">
                    <TakedownRequestForm />
                  </div>

                  <p className="text-[var(--color-muted)] text-sm mt-4">
                    Alternatively, you may email our team directly at{" "}
                    <strong>takedowns@carehomessupportdocs.org</strong>.
                  </p>
                </section>

                <section id="review-process" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                    5. Our Review Process
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    Upon receiving a takedown request:
                  </p>
                  <ol className="list-decimal pl-6 space-y-2 text-[var(--color-text)] text-lg">
                    <li>
                      <strong>Acknowledgment:</strong> You will receive an
                      automated email acknowledging receipt of your request.
                    </li>
                    <li>
                      <strong>Review:</strong> Our moderation team will review
                      the specified content against our Redaction Policy and the
                      original public CCLD citation.
                    </li>
                    <li>
                      <strong>Decision & Action:</strong> Within our 72-hour
                      target window, we will make a determination. If the
                      content violates our policy, it will be removed or
                      temporarily suspended pending redaction by the facility.
                    </li>
                    <li>
                      <strong>Notification:</strong> We will notify both you and
                      the facility operator of the decision and action taken.
                    </li>
                  </ol>
                </section>

                <section id="appeals-process" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                    6. Appeals Process
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    If your takedown request is denied, or if a facility
                    operator disputes a takedown decision, an appeal may be
                    submitted within 14 days of the decision notice. Appeals are
                    escalated to our senior moderation board for a final,
                    binding review. The content in question will remain offline
                    during the appeals process if it involves potential PII/PHI
                    exposure.
                  </p>
                </section>

                <section id="emergency-takedown" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">
                    7. Emergency Takedown
                  </h2>
                  <p className="text-[var(--color-text)] text-lg mb-4">
                    In cases of severe privacy violations (e.g., full medical
                    records, financial data, or Social Security Numbers being
                    inadvertently published), we reserve the right to execute an{" "}
                    <strong>Emergency Takedown</strong>. This means the content
                    will be removed immediately upon preliminary review, before
                    the formal 72-hour investigation concludes, to mitigate
                    harm.
                  </p>
                </section>

                <section id="incident-log" className="scroll-mt-28 mb-12">
                  <h2 className="text-3xl font-bold mb-4">8. Incident Log</h2>
                  <p className="text-[var(--color-text)] text-lg">
                    CareHomesSupportDocs.org maintains a secure, internal
                    incident log of all takedown requests, actions taken, and
                    correspondence. This log is kept for legal and compliance
                    auditing purposes and is{" "}
                    <strong>not publicly disclosed</strong>.
                  </p>
                </section>
              </div>
            </main>
          </div>
        </ResponsiveContainer>
      </div>
    </>
  );
}
