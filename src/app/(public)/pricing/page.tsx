import type { Metadata } from "next";
import Link from "next/link";
import { PricingCard } from "@/components/ui/PricingCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertCircle, ShieldAlert, Info } from "lucide-react";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/metadata";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description: "Transparent, annual membership pricing for CareHomesSupportDocs.org. Choose the tier that fits your facility operations.",
});

const FULL_TIERS = [
  {
    tier: "$300 Tier",
    planId: "TIER_A",
    price: 300,
    facilities: "Core membership / essential access",
    features: [
      "Member account included",
      "Core library content",
      "Defined core set of downloads & forms",
      "Basic directory or profile features, if offered",
      "Standard support / assistance",
      "Core access to events, training & resources",
      "Moderated rebuttal uploads",
      "Email support",
      "Public profile listing",
      "Citation tracking dashboard",
    ],
    ctaLabel: "Subscribe Now",
    ctaHref: "#",
  },
  {
    tier: "$400 Tier",
    planId: "TIER_B",
    price: 400,
    facilities: "Enhanced membership / expanded access",
    features: [
      "Member account included",
      "Core + expanded library content",
      "Expanded set of downloads & forms",
      "Enhanced directory or profile features, if offered",
      "Enhanced support / assistance",
      "Expanded access to events, training & resources",
      "Mid-tier special features included",
      "Deadline reminders",
      "Priority moderation (48hr)",
      "Multi-facility dashboard",
    ],
    highlighted: true,
    ctaLabel: "Subscribe Now",
    ctaHref: "#",
  },
  {
    tier: "$500 Tier",
    planId: "TIER_C",
    price: 500,
    facilities: "Top-tier membership / fullest approved access",
    features: [
      "Member account included",
      "Full approved content library",
      "Full approved set of downloads & forms",
      "Priority/expanded directory or profile features",
      "Highest approved level of support",
      "Full/priority access to events, training & resources",
      "Top-tier special features expressly listed",
      "Multi-seat access for staff",
      "Quarterly operations review",
      "White-glove onboarding",
    ],
    ctaLabel: "Subscribe Now",
    ctaHref: "#",
  },
];

const FAQS = [
  {
    question: "How does annual billing work?",
    answer: "You are billed once per year on the anniversary of your subscription. This helps us maintain our nonprofit operations predictably while keeping costs low for members."
  },
  {
    question: "What does 'facilities' mean?",
    answer: "A facility refers to a single licensed physical location registered with the CCLD. If you operate multiple homes under different license numbers, you must choose a tier that covers your total license count."
  },
  {
    question: "Can I cancel my membership?",
    answer: "Yes, you can cancel your renewal at any time. Your access will remain active until the end of your current annual billing cycle. We do not offer prorated refunds for partial years."
  },
  {
    question: "Is my payment secure?",
    answer: "Yes, all payments are processed securely via Stripe. We do not store your credit card information on our servers."
  },
  {
    question: "Are these prices final?",
    answer: "Prices are subject to change before our official launch. By signing up now, you will lock in the current advertised rates for your first year."
  }
];

export default async function PricingPage() {
  const user = await getUserFromRequest();
  let currentPlan: string | undefined;

  if (user) {
    const membership = await prisma.membership.findUnique({
      where: { organizationId: user.orgId },
      select: { plan: true, status: true },
    });
    if (membership?.status === "ACTIVE") {
      currentPlan = membership.plan;
    }
  }

  return (
    <div className="bg-[var(--color-bg)] w-full pb-24">
      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-white py-12 md:py-16 lg:py-24 relative overflow-hidden">
        {/* Subtle background element */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 0%, var(--color-surface) 0%, transparent 70%)`
          }}
        />

        <ResponsiveContainer className="relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto text-balance">
            We are a nonprofit organization. 100% of membership fees directly fund platform operations, moderation, and security. All plans are billed annually.
          </p>
        </ResponsiveContainer>
      </header>

      {/* Pricing Cards Section */}
      <section className="py-12 md:py-16 lg:py-24 -mt-16">
        <ResponsiveContainer>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
            {FULL_TIERS.map((tier) => (
              <PricingCard key={tier.tier} {...tier} currentPlan={currentPlan} />
            ))}
          </div>

          {/* Comprehensive Membership Guide Callout */}
          <div className="mt-10 max-w-6xl mx-auto bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-sm">
            <div className="flex gap-3.5 items-start">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Info className="h-5 w-5" />
              </div>
              <div className="text-sm space-y-1">
                <p className="font-bold text-[var(--color-primary)] text-base">
                  Need a detailed breakdown of all tier features?
                </p>
                <p className="text-[var(--color-muted)] leading-relaxed max-w-3xl">
                  Explore our comprehensive Membership Guide to learn how facility claims, Title 22 citation rebuttals, tamper-evident watermarked PDFs, and attorney sharing work across each plan.
                </p>
              </div>
            </div>
            <Link
              href="/membership-guide"
              className="inline-flex items-center justify-center shrink-0 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-xs sm:text-sm hover:bg-[var(--color-primary)]/90 transition shadow-sm"
            >
              View Membership Guide →
            </Link>
          </div>
        </ResponsiveContainer>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 lg:py-24">
        <ResponsiveContainer className="max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-primary)] mb-4">Pricing & Billing FAQ</h2>
          </div>

          <Accordion type="single" collapsible className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-6 py-2 shadow-sm">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className={index === FAQS.length - 1 ? "border-b-0" : ""}>
                <AccordionTrigger className="text-base font-semibold">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-[var(--color-muted)] leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ResponsiveContainer>
      </section>

      {/* Disclaimers Section */}
      <section className="py-12">
        <ResponsiveContainer className="max-w-4xl space-y-6">
          <div className="bg-[var(--color-primary)]/5 p-6 rounded-lg flex gap-4 items-start border border-[var(--color-primary)]/10">
            <ShieldAlert className="h-6 w-6 shrink-0 text-[var(--color-primary)] mt-1" />
            <div className="text-sm text-[var(--color-text)]">
              <p className="font-bold mb-1">Financial Disclaimer</p>
              <p>Prices subject to change before launch. Stripe processes all payments securely. We are a nonprofit — fees fund platform operations only.</p>
            </div>
          </div>

          <div className="bg-[var(--color-warning)] p-6 rounded-lg flex gap-4 items-start text-white shadow-sm">
            <AlertCircle className="h-6 w-6 shrink-0 mt-1" />
            <div className="text-sm">
              <p className="font-bold mb-1">Legal Disclaimer</p>
              <p>CareHomesSupportDocs.org does not provide legal advice. Membership does not include legal representation or advice. Always consult a licensed attorney for legal matters.</p>
            </div>
          </div>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
