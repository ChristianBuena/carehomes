import type { Metadata } from "next";
import { TableOfContents } from "@/components/ui/table-of-contents";
import { AlertTriangle, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Redaction Policy | CareHomesSupportDocs.org",
  description: "Strict privacy and redaction guidelines for all rebuttals published on CareHomesSupportDocs.org to protect resident identity and sensitive health data.",
};

const TOC_ITEMS = [
  { id: "what-is-redaction", label: "1. What Is Redaction?" },
  { id: "must-always-be-redacted", label: "2. What Must Always Be Redacted" },
  { id: "what-may-be-included", label: "3. What May Be Included" },
  { id: "our-moderation-process", label: "4. Our Moderation Process" },
  { id: "member-responsibilities", label: "5. Member Responsibilities" },
  { id: "violations-consequences", label: "6. Violations & Consequences" },
  { id: "contact-us", label: "7. Contact Us" },
];

export default function RedactionPolicyPage() {
  const lastUpdated = "August 15, 2026"; // Hardcoded for now, can be dynamic later

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Redaction Policy",
    "description": "Strict privacy and redaction guidelines for all rebuttals published on CareHomesSupportDocs.org.",
    "publisher": {
      "@type": "Organization",
      "name": "CareHomesSupportDocs.org"
    },
    "dateModified": new Date(lastUpdated).toISOString()
  };

  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-white py-16 md:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Redaction Policy
          </h1>
          <div className="flex items-center text-white/80 gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Last Updated: {lastUpdated}</span>
          </div>
        </div>
      </header>

      {/* Prominent Callout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 mb-12">
        <div className="bg-[var(--color-danger)]/10 border-l-4 border-[var(--color-danger)] p-6 rounded-r-lg flex gap-4 items-start shadow-sm">
          <AlertTriangle className="h-6 w-6 text-[var(--color-danger)] shrink-0 mt-0.5" />
          <p className="text-[var(--color-text)] font-semibold text-lg leading-relaxed">
            This policy exists to protect resident privacy. Violations will result in immediate takedown.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 relative">
          
          {/* TOC Sidebar - Desktop Only */}
          <aside className="hidden lg:block w-64 shrink-0">
            <TableOfContents items={TOC_ITEMS} />
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-prose">
            <div className="prose prose-slate prose-headings:text-[var(--color-primary)] prose-a:text-[var(--color-secondary)] prose-a:font-semibold hover:prose-a:text-[var(--color-primary)] prose-p:leading-relaxed prose-li:leading-relaxed">
              
              <section id="what-is-redaction" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">1. What Is Redaction?</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  Redaction is the process of censoring or obscuring part of a text for legal or security purposes. On CareHomesSupportDocs.org, redaction ensures that no sensitive personal information is ever published alongside a facility's rebuttal.
                </p>
                <p className="text-[var(--color-text)] text-lg">
                  Protecting the privacy and dignity of residents is our highest priority. Because rebuttals address specific CCLD citations—which often involve resident care—it is critical that no identifiable information slips into the public domain.
                </p>
              </section>

              <section id="must-always-be-redacted" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">2. What Must Always Be Redacted</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  When drafting a rebuttal, facility operators MUST completely omit or obscure the following information:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-[var(--color-text)] text-lg mb-4">
                  <li><strong>Resident Names:</strong> Initials (e.g., "Resident R1") are permitted if they match the CCLD report, but full names are strictly prohibited.</li>
                  <li><strong>Protected Health Information (PHI):</strong> Specific medical diagnoses, treatment details, or medication names that could identify a resident.</li>
                  <li><strong>Room Numbers & Locations:</strong> (e.g., "the resident in Room 4B").</li>
                  <li><strong>Family Member Names:</strong> Any identifying information regarding a resident's family or visitors.</li>
                  <li><strong>Social Security Numbers & Financials:</strong> Absolutely no financial or government IDs.</li>
                  <li><strong>Staff Names:</strong> Unless the staff member is a publicly listed administrator or licensee. Use titles instead (e.g., "the attending caregiver").</li>
                </ul>
              </section>

              <section id="what-may-be-included" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">3. What May Be Included</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  To provide a thorough and factual rebuttal, members may include:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-[var(--color-text)] text-lg">
                  <li>The specific <strong>CCLD Citation ID</strong> or report number.</li>
                  <li>The exact <strong>date</strong> of the inspection or incident as cited in the public record.</li>
                  <li>The relevant <strong>regulation number</strong> (e.g., Title 22 sections).</li>
                  <li>Factual descriptions of the <strong>facility's response</strong> or Plan of Correction (POC).</li>
                  <li>Professional opinions regarding the interpretation of the regulation, provided they remain objective and respectful.</li>
                </ul>
              </section>

              <section id="our-moderation-process" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">4. Our Moderation Process</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  CareHomesSupportDocs.org utilizes a human-in-the-loop moderation system. Before any rebuttal goes live on a facility profile:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-[var(--color-text)] text-lg">
                  <li>The submission is scanned by automated filters targeting common PII and PHI patterns.</li>
                  <li>A trained human moderator reviews the text contextually against the original public CCLD citation.</li>
                  <li>If prohibited information is found, the submission is rejected and returned to the member for revision. We do not edit your submissions for you.</li>
                </ol>
              </section>

              <section id="member-responsibilities" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">5. Member Responsibilities</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  By utilizing this platform, members assume primary liability for the content they submit. During the submission process, members must check a mandatory attestation box affirming that they have thoroughly reviewed their document for privacy compliance.
                </p>
                <p className="text-[var(--color-text)] text-lg">
                  While we provide moderation as a safeguard, the ultimate legal responsibility for adhering to HIPAA and state privacy laws rests with the licensed facility operator.
                </p>
              </section>

              <section id="violations-consequences" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">6. Violations & Consequences</h2>
                <p className="text-[var(--color-text)] text-lg mb-4">
                  Failure to adhere to this Redaction Policy will result in immediate consequences to ensure the integrity of the platform:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-[var(--color-text)] text-lg">
                  <li><strong>First Offense:</strong> Rebuttal rejection and a mandatory warning notice.</li>
                  <li><strong>Repeated Offenses:</strong> Temporary suspension of publishing privileges (30 days).</li>
                  <li><strong>Egregious Violations:</strong> Intentional or gross negligence regarding resident privacy will result in immediate and permanent account termination, with no refund of membership fees. If a live rebuttal is found to contain missed PII, it will be subject to <strong>immediate takedown</strong>.</li>
                </ul>
              </section>

              <section id="contact-us" className="scroll-mt-28 mb-12">
                <h2 className="text-3xl font-bold mb-4">7. Contact Us for Questions</h2>
                <p className="text-[var(--color-text)] text-lg">
                  If you are unsure whether specific details should be redacted from your rebuttal, err on the side of caution. For policy clarification, you may reach out to our moderation team at <a href="mailto:support@carehomessupportdocs.org">support@carehomessupportdocs.org</a>.
                </p>
              </section>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
