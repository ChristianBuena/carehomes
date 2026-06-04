import type { Metadata } from "next";
import { AlertOctagon, Scale, Shield, ExternalLink, Users, BookOpen, AlertTriangle, Building } from "lucide-react";

import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "Legal Disclaimer",
  description: "Important legal disclaimers regarding the use of CareHomesSupportDocs.org, including our status as an independent nonprofit and our policies on legal advice and content accuracy.",
});

const DISCLAIMERS = [
  {
    id: "not-government",
    title: "1. Not a Government Website",
    icon: Building,
    content: "CareHomesSupportDocs.org is an independent, private nonprofit organization. We are not a government agency, nor are we funded by, endorsed by, or affiliated with any local, state, or federal government entity."
  },
  {
    id: "not-affiliated-ccld",
    title: "2. Not Affiliated with CCLD",
    icon: Shield,
    content: "While this platform provides links to and references public citations from the California Department of Social Services Community Care Licensing Division (CCLD), we have no official affiliation with the CCLD. Our platform operates entirely independently to provide a voice for care facility operators."
  },
  {
    id: "not-legal-advice",
    title: "3. Not Legal Advice",
    icon: Scale,
    content: "Nothing contained on CareHomesSupportDocs.org—including articles, FAQs, guides, and member-submitted rebuttals—constitutes legal advice. The information provided is for general informational purposes only."
  },
  {
    id: "no-attorney-client",
    title: "4. No Attorney-Client Relationship",
    icon: Users,
    content: "Using this platform, contacting our support team, or submitting documents for moderation does not create an attorney-client relationship between you and CareHomesSupportDocs.org or any of its employees, directors, or affiliates."
  },
  {
    id: "information-accuracy",
    title: "5. Information Accuracy",
    icon: AlertTriangle,
    content: "While we strive to provide accurate and up-to-date information, facility data (including citation status) may not be current or complete. Always verify compliance and citation information directly at official government sources, such as the CCLD public portal."
  },
  {
    id: "member-content",
    title: "6. Member-Submitted Content",
    icon: BookOpen,
    content: "Rebuttals published on this site are submitted by independent facility operators. While we moderate these submissions strictly for privacy and compliance (e.g., removing PII/PHI), we do not investigate, endorse, or guarantee the factual accuracy of the claims made within the rebuttals."
  },
  {
    id: "provider-directory",
    title: "7. Provider Directory",
    icon: Shield, // Reused icon but fitting
    content: "Our directory of third-party service providers (e.g., consultants, legal professionals) consists of neutral listings. We do not vet, endorse, or guarantee the quality of services provided by any listed entity, nor do we collect referral fees."
  },
  {
    id: "external-links",
    title: "8. External Links",
    icon: ExternalLink,
    content: "This website contains links to third-party websites. CareHomesSupportDocs.org is not responsible for the content, privacy policies, or practices of any external sites. Links are provided solely for the convenience of our users."
  }
];

export default function DisclaimerPage() {
  const lastUpdated = "August 15, 2026"; // Hardcoded for now

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Legal Disclaimer",
    description: "Important legal disclaimers regarding the use of CareHomesSupportDocs.org.",
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
      <header className="bg-[var(--color-primary)] text-white py-16 md:py-20 border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Legal Disclaimer
          </h1>
          <p className="text-white/80 font-medium">Last Updated: {lastUpdated}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-12 mb-16">
        {/* Prominent Red/Amber Callout Box */}
        <div className="bg-[var(--color-danger)] text-white p-6 md:p-8 rounded-xl shadow-md mb-12 flex flex-col md:flex-row gap-6 items-center text-center md:text-left">
          <AlertOctagon className="h-12 w-12 shrink-0 text-white/90" strokeWidth={2} />
          <div>
            <h2 className="text-2xl font-black tracking-wide uppercase mb-2">
              Read This Disclaimer Before Using This Site
            </h2>
            <p className="text-white/90 text-sm md:text-base leading-relaxed font-medium">
              By accessing, browsing, or utilizing CareHomesSupportDocs.org, you acknowledge that you have read, understood, and agree to be bound by the terms outlined in this disclaimer. If you do not agree, you must exit this site immediately.
            </p>
          </div>
        </div>

        {/* Disclaimer Blocks Grid */}
        <div className="space-y-6">
          {DISCLAIMERS.map((disclaimer) => {
            const Icon = disclaimer.icon;
            return (
              <div 
                key={disclaimer.id} 
                id={disclaimer.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="bg-[var(--color-primary)]/10 p-3 rounded-lg shrink-0">
                    <Icon className="h-6 w-6 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">
                      {disclaimer.title}
                    </h3>
                    <p className="text-[var(--color-muted)] leading-relaxed">
                      {disclaimer.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
