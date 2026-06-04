import type { Metadata } from "next";
import { TableOfContents } from "@/components/ui/table-of-contents";
import { AlertTriangle, Construction } from "lucide-react";

import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service (DRAFT)",
  description: "Terms of Service and usage agreement for the CareHomesSupportDocs platform.",
});

const TOC_ITEMS = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "description", label: "2. Description of Service" },
  { id: "eligibility", label: "3. Eligibility" },
  { id: "accounts", label: "4. Member Accounts & Responsibilities" },
  { id: "prohibited", label: "5. Prohibited Uses" },
  { id: "ip", label: "6. Intellectual Property" },
  { id: "content-standards", label: "7. Content Standards" },
  { id: "moderation", label: "8. Moderation & Takedown" },
  { id: "warranties", label: "9. Disclaimer of Warranties" },
  { id: "liability", label: "10. Limitation of Liability" },
  { id: "indemnification", label: "11. Indemnification" },
  { id: "termination", label: "12. Termination" },
  { id: "governing-law", label: "13. Governing Law" },
  { id: "changes", label: "14. Changes to Terms" },
  { id: "contact", label: "15. Contact" },
];

export default function TermsPage() {
  const lastUpdated = "August 15, 2026";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service",
    description: "Terms of Service and usage agreement for the CareHomesSupportDocs platform.",
    publisher: {
      "@type": "Organization",
      name: "CareHomesSupportDocs.org",
    },
    dateModified: new Date(lastUpdated).toISOString(),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="bg-[var(--color-bg)] min-h-screen pb-24 relative overflow-hidden">
      
      {/* Draft Watermark Background */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] z-0 rotate-[-30deg]">
        <span className="text-[15rem] font-black text-black">DRAFT</span>
      </div>

      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-white py-16 md:py-20 border-b border-[var(--color-border)] relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-[var(--color-warning)] text-white px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
            <Construction className="h-4 w-4" />
            DRAFT STATUS
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Please read these terms carefully before using the CareHomesSupportDocs.org platform.
          </p>
        </div>
      </header>

      {/* Prominent Draft Callout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 mb-12 relative z-10">
        <div className="bg-[var(--color-warning)]/10 border-l-4 border-[var(--color-warning)] p-6 rounded-r-lg flex gap-4 items-start shadow-sm">
          <AlertTriangle className="h-6 w-6 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-[var(--color-text)] font-bold text-lg mb-1">DRAFT — Not yet in effect</h2>
            <p className="text-[var(--color-text)] leading-relaxed">
              This document is a draft for planning purposes. It has not been reviewed by an attorney and is not legally binding. It is subject to formal attorney review before the official platform launch.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 relative">
          
          {/* TOC Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-64 shrink-0">
            <TableOfContents items={TOC_ITEMS} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-prose bg-[var(--color-surface)] p-8 md:p-10 rounded-2xl border border-[var(--color-border)] shadow-sm">
            <div className="prose prose-slate prose-headings:text-[var(--color-primary)] prose-a:text-[var(--color-secondary)] prose-a:font-semibold hover:prose-a:text-[var(--color-primary)] prose-p:leading-relaxed prose-li:leading-relaxed">
              
              <section id="acceptance" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using CareHomesSupportDocs.org ("the Site"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Site.
                </p>
              </section>

              <section id="description" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                <p>
                  CareHomesSupportDocs.org provides a platform for licensed California care facility operators to publish rebuttals to public regulatory citations issued by the CCLD. We are a neutral host and do not endorse the contents of member submissions.
                </p>
              </section>

              <section id="eligibility" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">3. Eligibility</h2>
                <p>
                  Membership is strictly limited to licensed California care facility operators, their authorized administrators, or legal representatives. By creating an account, you warrant that you possess the legal authority to represent the facility associated with your account.
                </p>
              </section>

              <section id="accounts" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">4. Member Accounts & Responsibilities</h2>
                <p>
                  Members are responsible for maintaining the confidentiality of their account credentials. You are legally and ethically responsible for all content submitted through your account. You must ensure all submissions are factually accurate to the best of your knowledge.
                </p>
              </section>

              <section id="prohibited" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">5. Prohibited Uses</h2>
                <p>
                  You agree NOT to use the Site to:
                </p>
                <ul>
                  <li>Upload any Protected Health Information (PHI) or Personally Identifiable Information (PII) of residents.</li>
                  <li>Publish defamatory, libelous, harassing, or threatening content.</li>
                  <li>Submit knowingly false or misleading information.</li>
                  <li>Impersonate any person or government entity.</li>
                </ul>
              </section>

              <section id="ip" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
                <p>
                  You retain ownership of the content you submit. By submitting content, you grant CareHomesSupportDocs.org a non-exclusive, worldwide, royalty-free license to publish, distribute, and display the content on the Site. The platform's code, design, and logos remain the exclusive property of CareHomesSupportDocs.org.
                </p>
              </section>

              <section id="content-standards" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">7. Content Standards</h2>
                <p>
                  All submissions must adhere strictly to our Redaction Policy. Submissions must remain professional, objective, and directly related to the specific regulatory citation being addressed.
                </p>
              </section>

              <section id="moderation" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">8. Moderation & Takedown</h2>
                <p>
                  We reserve the right to review, reject, or remove any content at our sole discretion, without prior notice, if it violates these Terms or our Redaction Policy. We may also suspend or terminate accounts for repeated violations.
                </p>
              </section>

              <section id="warranties" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">9. Disclaimer of Warranties</h2>
                <p>
                  The Site is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the site will be error-free or uninterrupted.
                </p>
              </section>

              <section id="liability" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">10. Limitation of Liability</h2>
                <p>
                  In no event shall CareHomesSupportDocs.org, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Site or the content published on it.
                </p>
              </section>

              <section id="indemnification" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">11. Indemnification</h2>
                <p>
                  You agree to indemnify and hold harmless CareHomesSupportDocs.org from any claims, damages, liabilities, and expenses (including legal fees) arising from your use of the Site, your submitted content, or your violation of these Terms.
                </p>
              </section>

              <section id="termination" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">12. Termination</h2>
                <p>
                  We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                </p>
              </section>

              <section id="governing-law" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">13. Governing Law</h2>
                <p>
                  These Terms shall be governed and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
                </p>
              </section>

              <section id="changes" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">14. Changes to Terms</h2>
                <p>
                  We reserve the right to modify or replace these Terms at any time. We will provide notice of significant changes on the Site. Your continued use of the Site following the posting of any changes constitutes acceptance of those changes.
                </p>
              </section>

              <section id="contact" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">15. Contact</h2>
                <p>
                  If you have any questions about these Terms, please contact us at <a href="mailto:legal@carehomessupportdocs.org">legal@carehomessupportdocs.org</a>.
                </p>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}
