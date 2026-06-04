import type { Metadata } from "next";
import { PricingCard } from "@/components/ui/PricingCard";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertCircle, ShieldAlert } from "lucide-react";

import { buildMetadata } from "@/lib/metadata";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description: "Transparent, annual membership pricing for CareHomesSupportDocs.org. Choose the tier that fits your facility operations.",
});

const FULL_TIERS = [
  {
    tier: "Tier A",
    price: 300,
    facilities: "1 Facility",
    features: [
      "Moderated rebuttal uploads",
      "Standard template access",
      "Email support",
      "Public profile listing",
      "Citation tracking dashboard"
    ],
    ctaLabel: "Subscribe Now",
    ctaHref: "#",
  },
  {
    tier: "Tier B",
    price: 400,
    facilities: "Up to 3 Facilities",
    features: [
      "Everything in Tier A",
      "Deadline reminders",
      "Priority moderation (48hr)",
      "Multi-facility dashboard",
      "Dedicated account specialist"
    ],
    highlighted: true,
    ctaLabel: "Subscribe Now",
    ctaHref: "#",
  },
  {
    tier: "Tier C",
    price: 500,
    facilities: "Up to 10 Facilities",
    features: [
      "Everything in Tier B",
      "Multi-seat access for staff",
      "Quarterly operations review",
      "API access for citation sync",
      "White-glove onboarding"
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

export default function PricingPage() {
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
              <PricingCard key={tier.tier} {...tier} />
            ))}
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
