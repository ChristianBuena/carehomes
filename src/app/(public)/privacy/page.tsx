import type { Metadata } from "next";
import { TableOfContents } from "@/components/ui/table-of-contents";
import { AlertTriangle, Construction } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy (DRAFT) | CareHomesSupportDocs.org",
  description: "Learn how CareHomesSupportDocs.org collects, uses, and protects your information.",
};

const TOC_ITEMS = [
  { id: "introduction", label: "1. Introduction & Scope" },
  { id: "info-we-collect", label: "2. Information We Collect" },
  { id: "how-we-use", label: "3. How We Use Information" },
  { id: "info-we-do-not-collect", label: "4. Information We Do NOT Collect" },
  { id: "data-sharing", label: "5. Data Sharing" },
  { id: "data-retention", label: "6. Data Retention" },
  { id: "security", label: "7. Security Measures" },
  { id: "your-rights", label: "8. Your Rights" },
  { id: "cookies", label: "9. Cookies & Analytics" },
  { id: "childrens-privacy", label: "10. Children's Privacy" },
  { id: "changes", label: "11. Changes to This Notice" },
  { id: "contact", label: "12. Contact" },
];

export default function PrivacyPolicyPage() {
  return (
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
            Privacy Policy
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Our commitment to transparency and protecting your data.
          </p>
        </div>
      </header>

      {/* Prominent Draft Callout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 mb-12 relative z-10">
        <div className="bg-[var(--color-warning)]/10 border-l-4 border-[var(--color-warning)] p-6 rounded-r-lg flex gap-4 items-start shadow-sm">
          <AlertTriangle className="h-6 w-6 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-[var(--color-text)] font-bold text-lg mb-1">DRAFT — Subject to attorney review before launch.</h2>
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
              
              <section id="introduction" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">1. Introduction & Scope</h2>
                <p>
                  CareHomesSupportDocs.org ("we", "our", "us") respects your privacy. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you visit our website or use our platform services.
                </p>
              </section>

              <section id="info-we-collect" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
                <p>
                  We collect information necessary to operate the platform securely:
                </p>
                <ul>
                  <li><strong>Account Information:</strong> Name, email address, facility license numbers, and professional contact details provided during registration.</li>
                  <li><strong>Submitted Content:</strong> The text and metadata of any rebuttals or documents you submit for moderation and publication.</li>
                  <li><strong>Usage Data:</strong> Information about how you navigate and interact with our platform (IP address, browser type, pages visited).</li>
                  <li><strong>Payment Data:</strong> Subscription and billing information securely processed via our payment provider, Stripe. We do not store full credit card numbers on our servers.</li>
                </ul>
              </section>

              <section id="how-we-use" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">3. How We Use Information</h2>
                <p>
                  We use your information strictly to:
                </p>
                <ul>
                  <li>Verify facility licenses and maintain the integrity of member accounts.</li>
                  <li>Process payments and manage subscription renewals.</li>
                  <li>Communicate with you regarding moderation decisions, support inquiries, and platform updates.</li>
                  <li>Improve and optimize our platform's functionality and security.</li>
                </ul>
              </section>

              <section id="info-we-do-not-collect" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">4. Information We Do NOT Collect</h2>
                <p>
                  We have a strict policy regarding sensitive health data. We <strong>never</strong> intentionally collect, store, or publish Protected Health Information (PHI) or Personally Identifiable Information (PII) of residents. If such information is submitted in a draft rebuttal, our moderation process intercepts and mandates the redaction or removal of this data prior to publication.
                </p>
              </section>

              <section id="data-sharing" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">5. Data Sharing</h2>
                <p>
                  We do not sell, rent, or trade your personal information. We may share necessary data only with trusted third-party service providers (e.g., Stripe for payment processing, secure cloud hosting providers) bound by strict confidentiality agreements to facilitate our platform operations.
                </p>
              </section>

              <section id="data-retention" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
                <p>
                  We retain account information for as long as your membership is active. Moderation logs and history are securely stored for up to 2 years for auditing and compliance purposes. Any rejected drafts containing severe privacy violations (like accidental PHI inclusion) are purged from our active systems immediately upon rejection.
                </p>
              </section>

              <section id="security" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">7. Security Measures</h2>
                <p>
                  We implement robust administrative, technical, and physical security measures to protect your data. This includes Multi-Factor Authentication (MFA) requirements for all platform administrators and strict Role-Based Access Controls (RBAC) to ensure your data is only handled by authorized personnel.
                </p>
              </section>

              <section id="your-rights" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">8. Your Rights</h2>
                <p>
                  Depending on your jurisdiction, you may have the right to request access to, correction of, or deletion of your personal data. You may submit these requests directly to our support team. We will process all valid requests in accordance with applicable state and federal laws.
                </p>
              </section>

              <section id="cookies" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">9. Cookies & Analytics</h2>
                <p>
                  We use cookies and similar tracking technologies to improve user experience. Specifically, we utilize Google Analytics (GA4) to track aggregated, anonymized usage patterns, such as page views and navigation flows, to help us optimize the platform. You may adjust your browser settings to decline cookies if preferred.
                </p>
              </section>

              <section id="childrens-privacy" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">10. Children's Privacy</h2>
                <p>
                  Our platform is intended exclusively for adult professionals and licensed facility operators. We do not knowingly collect personal information from individuals under the age of 18.
                </p>
              </section>

              <section id="changes" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">11. Changes to This Notice</h2>
                <p>
                  We may update this Privacy Policy periodically to reflect changes in our practices or regulatory requirements. We will notify members of significant changes via email and update the "Last Updated" date on this page.
                </p>
              </section>

              <section id="contact" className="scroll-mt-28 mb-12">
                <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
                <p>
                  If you have any questions, concerns, or privacy-related requests, please contact our Privacy Officer at <a href="mailto:privacy@carehomessupportdocs.org">privacy@carehomessupportdocs.org</a>.
                </p>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
