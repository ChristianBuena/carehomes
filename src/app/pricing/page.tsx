"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const plans = [
  {
    label: "Basic",
    plan: "TIER_A",
    price: 300,
    description: "Perfect for small facilities",
    priceId: "price_1TgsvuIgV8gft3QpEVbiVCjX",
  },
  {
    label: "Pro",
    plan: "TIER_B",
    price: 400,
    description: "Best for growing facilities",
    popular: true,
    priceId: "price_1TgslqIgV8gft3QpabXM1WX1",
  },
  {
    label: "Enterprise",
    plan: "TIER_C",
    price: 500,
    description: "For large organizations",
    priceId: "price_1TgsmqIgV8gft3QpOisOIT7n",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const selectPlan = async (priceId: string, plan: string) => {
    try {
      setLoadingPlan(plan);

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to start checkout");
        return;
      }

      // redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Error selecting plan:", error);
      alert("Something went wrong");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">
          Simple, Transparent Pricing
        </h1>

        <p className="text-center text-gray-600 mb-12">
          Choose the plan that fits your needs
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((planItem) => (
            <div
              key={planItem.plan}
              className={`bg-white rounded-lg shadow-md p-8 ${
                planItem.popular ? "ring-2 ring-blue-600" : ""
              }`}
            >
              {planItem.popular && (
                <div className="text-sm font-bold text-blue-600 mb-2">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2">
                {planItem.label}
              </h3>

              <p className="text-gray-600 mb-4">
                {planItem.description}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ₱{planItem.price}
                </span>
                <span className="text-gray-500"> / month</span>
              </div>

              <button
                onClick={() =>
                  selectPlan(planItem.priceId, planItem.plan)
                }
                disabled={loadingPlan === planItem.plan}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  planItem.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {loadingPlan === planItem.plan
                  ? "Redirecting..."
                  : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}