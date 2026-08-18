import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertCircle, ArrowRight, UserPlus, FileUp, CheckCircle, Globe } from "lucide-react";

import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export const metadata: Metadata = buildMetadata({
  title: "How It Works",
  description: "Learn how the CareHomesSupportDocs platform works, from joining as a member to publishing your regulatory rebuttals securely and compliantly.",
});

const STEPS = [
  {
    id: 1,
    title: "Join as a Member",
    icon: UserPlus,
    whatHappens: "You sign up for a membership plan and provide your facility license details. We manually verify your status with official CCLD public records before granting full access.",
    whoInvolved: "Facility Administrator & Our Verification Team",
    timeline: "Verification typically takes 1-2 business days.",
    prepare: "Your active CCLD facility license number and official contact information.",
  },
  {
    id: 2,
    title: "Submit Your Rebuttal",
    icon: FileUp,
    whatHappens: "Log into your secure dashboard to select the specific citation you wish to address. Draft your rebuttal using our structured, privacy-first template.",
    whoInvolved: "Facility Administrator",
    timeline: "Self-paced. You can save drafts and submit when ready.",
    prepare: "The official citation number, date, and your factual, emotion-free response.",
  },
  {
    id: 3,
    title: "Moderation Review",
    icon: CheckCircle,
    whatHappens: "Our independent moderation team reviews your submission strictly for compliance with our platform policies, ensuring no resident identifying information (PHI/PII) is included and language remains professional.",
    whoInvolved: "Our Moderation Team",
    timeline: "Typically 3-5 business days.",
    prepare: "Be ready to receive and act on revision requests if our team flags privacy concerns.",
  },
  {
    id: 4,
    title: "Published to Facility Page",
    icon: Globe,
    whatHappens: "Once approved, your rebuttal is published directly on your facility's public profile page on our site, alongside the official CCLD citation data.",
    whoInvolved: "Automated Publishing System",
    timeline: "Immediate upon approval.",
    prepare: "Nothing further. You will receive an email notification with a direct link to the published rebuttal.",
  }
];

const FAQS = [
  {
    question: "What is a rebuttal?",
    answer: "A rebuttal is your facility's formal, factual response to a regulatory citation. It allows you to provide context, explain corrective actions, or clarify misunderstandings related to a specific deficiency cited by the CCLD."
  },
  {
    question: "Is this legal advice?",
    answer: "NO. CareHomesSupportDocs.com does not provide legal advice. We provide a publishing platform. Always consult a licensed attorney for legal matters or before submitting legally sensitive statements."
  },
  {
    question: "How long does moderation take?",
    answer: "Our standard moderation process takes 3-5 business days. During high volume periods, it may take slightly longer. You will be notified via email once the review is complete."
  },
  {
    question: "What gets redacted?",
    answer: "We enforce strict privacy standards. Any Protected Health Information (PHI), Personally Identifiable Information (PII) of residents, staff names (unless publicly cited administrators), and emotionally charged or defamatory language will be redacted or rejected."
  },
  {
    question: "Can I edit a rebuttal after it's published?",
    answer: "Yes, but any edits will trigger a new moderation review cycle. The previous version will remain live until the new version is approved to prevent circumvention of our privacy policies."
  },
  {
    question: "Will the CCLD see my rebuttal?",
    answer: "We do not submit your rebuttal directly to the CCLD on your behalf. This platform publishes your response publicly for families and stakeholders to read alongside the public citation data."
  }
];

export default function HowItWorksPage() {

  const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",

  "@id": "https://carehomessupportdocs.com/how-it-works",

  url: "https://carehomessupportdocs.com/how-it-works",

  name: "How It Works",

  description:
    "Learn how the CareHomesSupportDocs platform works, from membership verification to publishing regulatory rebuttals securely and compliantly.",

  inLanguage: "en-US",

  isPartOf: {
    "@type": "WebSite",
    name: "CareHomesSupportDocs",
    url: "https://carehomessupportdocs.com",
  },

  publisher: {
    "@type": "Organization",
    name: "CareHomesSupportDocs",
    url: "https://carehomessupportdocs.com",
  },
};

  return (

    <>
  <JsonLd data={jsonLd} />
    <div className="bg-[var(--color-bg)] w-full">
      {/* Disclaimer Banner */}
      <div className="bg-[var(--color-warning)] text-[var(--color-surface)] w-full py-3 px-4">
        <ResponsiveContainer className="flex items-start sm:items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" />
          <p className="text-sm font-medium leading-relaxed">
            <strong>Important Notice:</strong> CareHomesSupportDocs.org does not provide legal advice. Always consult a licensed attorney for legal matters.
          </p>
        </ResponsiveContainer>
      </div>

      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-[var(--color-surface)] py-12 md:py-16 lg:py-24">
        <ResponsiveContainer className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            How the Platform Works
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-surface)]/80 max-w-3xl mx-auto text-balance">
            Our step-by-step process ensures that every rebuttal is published securely, transparently, and in full compliance with privacy standards.
          </p>
        </ResponsiveContainer>
      </header>

      {/* Detailed Steps Section */}
      <section className="py-12 md:py-16 lg:py-24">
        <ResponsiveContainer className="max-w-5xl">
          <div className="space-y-16">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className="bg-[var(--color-primary)]/5 p-8 md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-[var(--color-border)]">
                    <div className="h-16 w-16 bg-[var(--color-primary)] text-[var(--color-surface)] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="text-[var(--color-secondary)] font-bold text-sm tracking-wider uppercase mb-2">Step {step.id}</div>
                    <h2 className="text-2xl font-bold text-[var(--color-text)]">{step.title}</h2>
                  </div>
                  
                  <div className="p-8 md:w-2/3 space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-2">What happens</h3>
                      <p className="text-[var(--color-text)] leading-relaxed">{step.whatHappens}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-2">Who is involved</h3>
                        <p className="text-[var(--color-muted)] text-sm">{step.whoInvolved}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-2">Typical timeline</h3>
                        <p className="text-[var(--color-muted)] text-sm">{step.timeline}</p>
                      </div>
                    </div>
                    
                    <div className="bg-[var(--color-bg)] p-4 rounded-lg border border-[var(--color-border)]">
                      <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-2">What you need to prepare</h3>
                      <p className="text-[var(--color-text)] text-sm">{step.prepare}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ResponsiveContainer>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 lg:py-24 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
        <ResponsiveContainer className="max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-primary)] mb-4">Frequently Asked Questions</h2>
            <p className="text-[var(--color-muted)]">Everything you need to know about the rebuttal process.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-base sm:text-lg">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-[var(--color-muted)] leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ResponsiveContainer>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 lg:py-24 text-center">
        <ResponsiveContainer className="max-w-4xl flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-primary)] mb-6">Ready to get started?</h2>
          <p className="text-lg text-[var(--color-muted)] mb-10 max-w-2xl text-balance">
            Join our platform today to ensure your facility's voice is heard securely and professionally.
          </p>
          <Button asChild size="lg" className="bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-surface)] font-semibold group h-14 px-8 text-lg rounded-full">
            <Link href="/pricing">
              View Pricing <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </ResponsiveContainer>
      </section>
    </div>
    </>
  );
  
}
