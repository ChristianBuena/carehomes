import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PricingCardProps {
  tier: string;
  price: number;
  facilities: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export function PricingCard({
  tier,
  price,
  facilities,
  features,
  highlighted = false,
  ctaLabel,
  ctaHref,
}: PricingCardProps) {
  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl ${
        highlighted
          ? "bg-[var(--color-primary)] text-white shadow-xl ring-2 ring-[var(--color-accent)] scale-100 md:scale-105 z-10"
          : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-sm"
      }`}
    >
      {highlighted && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <span className="bg-[var(--color-accent)] text-white text-sm font-bold px-3 py-1 uppercase tracking-wide rounded-full shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-8">
        <h3 className={`text-xl font-bold mb-2 ${highlighted ? "text-white" : "text-[var(--color-primary)]"}`}>
          {tier}
        </h3>
        <p className={`text-base mb-6 ${highlighted ? "text-white/80" : "text-[var(--color-muted)]"}`}>
          {facilities}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight">${price}</span>
          <span className={`text-base font-medium ${highlighted ? "text-white/80" : "text-[var(--color-muted)]"}`}>
            /year
          </span>
        </div>
        <p className={`text-sm mt-2 ${highlighted ? "text-white/60" : "text-[var(--color-muted)]"}`}>
          Billed annually
        </p>
      </div>

      <ul className="flex-1 space-y-4 mb-8">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-base">
            <Check
              className={`h-5 w-5 shrink-0 ${highlighted ? "text-[var(--color-accent)]" : "text-[var(--color-secondary)]"}`}
            />
            <span className={highlighted ? "text-white/90" : "text-[var(--color-text)]"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className={`w-full h-12 font-semibold ${
          highlighted
            ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
        }`}
      >
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
