"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export interface PricingCardProps {
  tier: string;
  planId: string;
  price: number;
  facilities: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  currentPlan?: string;
}

export function PricingCard({
  tier,
  planId,
  price,
  facilities,
  features,
  highlighted = false,
  ctaLabel,
  currentPlan,
}: PricingCardProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isCurrentPlan = currentPlan === planId;

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/pricing");
      return;
    }

    if (isCurrentPlan) return;

    setLoading(true);
    try {
      // If they already have a plan, direct them to the portal to upgrade/downgrade safely
      if (currentPlan) {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();
        if (res.ok && data.url) {
          window.location.href = data.url;
          return;
        }
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(false);
      }
    } catch (error) {
      console.error("Network error:", error);
      setLoading(false);
    }
  };
  const planWeights: Record<string, number> = { TIER_A: 1, TIER_B: 2, TIER_C: 3 };
  const currentWeight = currentPlan ? planWeights[currentPlan] || 0 : 0;
  const thisWeight = planWeights[planId] || 0;

  const buttonText = loading
    ? "Redirecting..."
    : isCurrentPlan
    ? "Active Plan"
    : currentPlan
    ? "Manage Subscription"
    : ctaLabel;

  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl ${
        highlighted
          ? "bg-[var(--color-primary)] text-white shadow-xl ring-2 ring-[var(--color-accent)] scale-100 md:scale-105 z-10"
          : "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] shadow-sm"
      }`}
    >
      {highlighted && !isCurrentPlan && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <span className="bg-[var(--color-accent)] text-white text-sm font-bold px-3 py-1 uppercase tracking-wide rounded-full shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute top-0 right-6 transform -translate-y-1/2">
          <span className="bg-[var(--color-success)] text-white text-sm font-bold px-3 py-1 uppercase tracking-wide rounded-full shadow-sm">
            Current Plan
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
        onClick={handleSubscribe}
        disabled={loading || isCurrentPlan}
        className={`w-full h-12 font-semibold ${
          highlighted && !isCurrentPlan
            ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            : isCurrentPlan
            ? "bg-[var(--color-success)] text-white hover:bg-[var(--color-success)] cursor-default"
            : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90"
        }`}
      >
        {buttonText}
      </Button>
    </div>
  );
}
