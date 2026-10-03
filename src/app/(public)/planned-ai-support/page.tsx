import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Planned ChatGPT AI Assistance — CareHomesSupportDocs.org",
  description:
    "Learn about our planned ChatGPT AI tools to support attorneys and supervised paralegals in organizing records and preparing timely citation replies.",
});

const HOW_IT_HELPS_CARDS = [
  {
    title: "Understand a notice",
    description:
      "Plain-language summaries of allegations, requested actions and stated dates, checked against the original.",
  },
  {
    title: "Organize supporting records",
    description:
      "A chronology and evidence index with links to source pages and existing Bates numbers.",
  },
  {
    title: "Respond to each allegation",
    description:
      "A response table separating your account, supporting and contrary evidence, and unanswered questions.",
  },
  {
    title: "Prepare a first draft",
    description:
      "An editable draft based on an attorney-selected template and authorized records, with unsupported statements flagged.",
  },
  {
    title: "Review legal sources",
    description:
      "Source-linked research for the approved jurisdiction, with attorney verification of accuracy and applicability.",
  },
  {
    title: "Make participation easier",
    description:
      "Guided questions, accessible forms, and optional dictation or translation subject to your factual confirmation.",
  },
];

const DEADLINE_STEPS = [
  {
    title: "Identify the deadline.",
    description:
      "Record the notice, jurisdiction, service date and method. A responsible reviewer verifies the rule or order, date, cutoff time and timezone.",
  },
  {
    title: "Assign the work.",
    description:
      "A named attorney and support team accept the matter, with a backup contact and agreed scope.",
  },
  {
    title: "Prepare and review.",
    description:
      "Plan time for missing evidence, drafting, attorney review, your factual confirmation and signatures.",
  },
  {
    title: "Escalate delays.",
    description:
      "The planned workflow flags unaccepted assignments, incomplete evidence, overdue review and failed reminders for human follow-up.",
  },
  {
    title: "Confirm delivery and service.",
    description:
      "Track the exact approved document, submission receipt, any rejection and required service evidence separately.",
  },
];

export default function PlannedAiSupportPage() {
  return (
    <div className="py-12 md:py-20 bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl">
        {/* Main Card Shell */}
        <div className="p-6 sm:p-10 md:p-14 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl space-y-12">
          
          {/* Header */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em] block">
              Planned Member Service
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]">
              ChatGPT AI assistance for clearer, timely replies
            </h1>
            <p className="text-base md:text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              We are planning AI assistance to help an engaged attorney and supervised paralegals organize your records, prepare reply documents and coordinate the work before a verified deadline.
            </p>

            {/* Warning Callout Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text)] mt-6 space-y-2">
              <h2 className="font-bold text-[var(--color-text)] text-base">
                Not available for casework yet
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                This page explains the planned service. AI processing, automated legal-deadline reminders and new legal intake are not active. Membership does not include legal representation or reserve an attorney.
              </p>
            </div>

            {/* Jump Navigation Links */}
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-sm font-semibold text-[var(--color-primary)]">
              <a href="#how-it-could-help" className="hover:underline">
                How it could help
              </a>
              <a href="#deadlines" className="hover:underline">
                Deadlines
              </a>
              <a href="#privacy-and-review" className="hover:underline">
                Privacy and review
              </a>
              <a href="#your-next-steps" className="hover:underline">
                Your next steps
              </a>
            </nav>
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Section 1: How it could help */}
          <section id="how-it-could-help" className="space-y-6 scroll-mt-24">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Less time assembling information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {HOW_IT_HELPS_CARDS.map((card) => (
                <div
                  key={card.title}
                  className="p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-sm space-y-2 hover:border-[var(--color-primary)]/40 transition-colors"
                >
                  <h3 className="font-bold text-[var(--color-text)] text-base md:text-lg">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-[var(--color-muted)] leading-relaxed pt-2">
              Your attorney would choose the appropriate response and review its legal content. Paralegals would work under attorney supervision. You would confirm your factual account and review the approved document before delivery.
            </p>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 2: Deadlines */}
          <section id="deadlines" className="space-y-6 scroll-mt-24">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              From the notice to confirmation of submission
            </h2>

            <div className="space-y-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {DEADLINE_STEPS.map((step) => (
                <p key={step.title}>
                  <strong className="text-[var(--color-text)] font-bold">{step.title}</strong>{" "}
                  {step.description}
                </p>
              ))}
            </div>

            <p className="text-xs text-[var(--color-muted)] leading-relaxed pt-1">
              A draft marked approved is not proof of filing. An extension request does not automatically change the original deadline. The service would not guarantee a filing deadline, agency result or court outcome.
            </p>

            {/* Alert: Have a deadline now? */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border-l-4 border-l-[var(--color-primary)] border border-[var(--color-border)] space-y-2">
              <h3 className="font-bold text-[var(--color-text)] text-base">
                Have a deadline now?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Contact your attorney or another qualified legal professional promptly. Do not wait for this planned service or a general helpdesk reply. Keep the original notice, envelope or service email and your supporting records.
              </p>
            </div>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 3: Privacy & Review */}
          <section id="privacy-and-review" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight mb-4">
              Your records and your choices
            </h2>

            <div className="space-y-3.5 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
              <p>
                Private case records would be accessible only to the authorized matter team. Association administration alone would not grant access.
              </p>
              <p>
                Before AI processing, the provider would explain the information used, retention, processing arrangements and applicable consent choices. Confidentiality would not be assumed from an AI label.
              </p>
              <p>
                AI drafts would remain subject to verification. Uncertain facts, missing evidence and unverified legal citations would be marked for review.
              </p>
              <p>
                Private rebuttals would never automatically become public educational resources. Sharing requires a separate authorized, redacted and reviewed copy.
              </p>
              <p>
                Identifiable resident medical and care records remain outside the initial scope.
              </p>
              <p>
                ChatGPT and OpenAI identify the intended technology, not the provider of your legal advice. This association service is not endorsed by OpenAI. Technical connection, professional review and release acceptance are required before activation.
              </p>
            </div>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 4: Your Next Steps */}
          <section id="your-next-steps" className="space-y-6 scroll-mt-24">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              What you can do today
            </h2>

            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-3xl">
              Read the service plan, review your membership options or sign in to see existing authorized records. Ask general availability questions without sending private documents. Future technology charges and attorney fees will be disclosed separately before any agreement.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-7 py-2.5 shadow-md shadow-[var(--color-primary)]/20 transition-all text-sm"
              >
                <Link href="/pricing">Membership options</Link>
              </Button>

              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
              >
                Existing member services
              </Link>

              <a
                href="mailto:support@carehomessupportdocs.org?subject=Planned%20AI%20Support%20Inquiry"
                className="text-xs sm:text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
              >
                General availability questions
              </a>
            </div>

            {/* Sublinks */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[var(--color-primary)] pt-2">
              <Link href="/providers" className="hover:underline">
                Independent legal providers
              </Link>
              <span className="text-[var(--color-muted)]">•</span>
              <Link href="/privacy" className="hover:underline">
                AI privacy and review policy
              </Link>
              <span className="text-[var(--color-muted)]">•</span>
              <Link href="/" className="hover:underline">
                Go to Home
              </Link>
            </div>

            {/* Accordion FAQs */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem
                  value="faq-1"
                  className="border-b border-[var(--color-border)] py-1"
                >
                  <AccordionTrigger className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] text-left">
                    Will AI act as my attorney or submit a reply automatically?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pt-2">
                    No. The planned service supports an independently engaged attorney and supervised staff. Legal decisions, final approval and submission authorization remain with the responsible people. An upload, membership or AI draft does not establish representation.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="faq-2"
                  className="border-b-0 py-1"
                >
                  <AccordionTrigger className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] text-left">
                    Will reminders protect my deadline?
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pt-2">
                    Reminders would support the agreed workflow, but they can fail and do not extend deadlines. The responsible attorney and member must confirm who will submit and serve the reply. Automated legal-deadline reminders are not active today.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>

        </div>
      </ResponsiveContainer>
    </div>
  );
}
