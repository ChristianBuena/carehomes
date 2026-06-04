import HeroSection from "@/components/sections/HeroSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import ValuePropositionSection from "@/components/sections/ValuePropositionSection";
import PricingPreviewSection from "@/components/sections/PricingPreviewSection";
import DisclaimerCallout from "@/components/sections/DisclaimerCallout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareHomesSupportDocs.org — Rebuttal Management for Care Facilities",
  description: "A nonprofit platform helping licensed California care facility operators manage, submit, and publish regulatory rebuttals with compliance and transparency.",
  openGraph: {
    title: "CareHomesSupportDocs.org — Rebuttal Management for Care Facilities",
    description: "A nonprofit platform helping licensed California care facility operators manage, submit, and publish regulatory rebuttals with compliance and transparency.",
    type: "website",
    url: "https://carehomessupportdocs.org",
  },
};

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ValuePropositionSection />
      <HowItWorksSection />
      <PricingPreviewSection />
      <DisclaimerCallout />
    </main>
  );
}
