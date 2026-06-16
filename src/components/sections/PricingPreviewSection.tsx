import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PricingCard } from "@/components/ui/PricingCard";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

const PREVIEW_TIERS = [
  {
    tier: "Tier A",
    planId: "TIER_A",
    price: 300,
    facilities: "1 Facility",
    features: [
      "Moderated rebuttal uploads",
      "Template access",
      "Email support",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/pricing",
  },
  {
    tier: "Tier B",
    planId: "TIER_B",
    price: 400,
    facilities: "Up to 3 Facilities",
    features: [
      "Everything in Tier A",
      "Deadline reminders",
      "Priority moderation",
    ],
    highlighted: true,
    ctaLabel: "Get Started",
    ctaHref: "/pricing",
  },
  {
    tier: "Tier C",
    planId: "TIER_C",
    price: 500,
    facilities: "Up to 10 Facilities",
    features: [
      "Everything in Tier B",
      "Multi-seat access",
      "Quarterly operations review",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/pricing",
  },
];

export default function PricingPreviewSection() {
  return (
    <section className="py-12 md:py-16 lg:py-24 bg-[var(--color-surface)] border-y border-[var(--color-border)]">
      <ResponsiveContainer>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--color-primary)]">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-[var(--color-muted)]">
            Choose the membership tier that fits your operational needs. All plans are billed annually.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto mb-12">
          {PREVIEW_TIERS.map((tier) => (
            <PricingCard key={tier.tier} {...tier} />
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center min-h-[44px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] font-semibold transition-colors group"
          >
            See Full Pricing
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </ResponsiveContainer>
    </section>
  );
}