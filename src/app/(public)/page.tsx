import type { Metadata } from "next";
import HeroSection from "@/components/sections/HeroSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import ValuePropositionSection from "@/components/sections/ValuePropositionSection";
import PricingPreviewSection from "@/components/sections/PricingPreviewSection";
import DisclaimerCallout from "@/components/sections/DisclaimerCallout";
import { StatsSection } from "@/components/sections/StatsSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { DisclaimerBanner } from "@/components/sections/DisclaimerBanner";
import { RecentFacilitiesSection } from "@/components/sections/RecentFacilitiesSection";
import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildMetadata({
  title: "CareHomesSupportDocs.com — Rebuttal Management for Care Facilities",
  description:
    "CareHomesSupportDocs.com is a nonprofit platform that helps licensed California care facility operators securely manage, submit, and publish rebuttals to regulatory citations.",
});

const ngoSchema = {
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "CareHomesSupportDocs.com",
  url: "https://carehomessupportdocs.com",
  description:
    "An independent nonprofit platform helping licensed California care facility operators manage, submit, and publish rebuttals to regulatory citations with compliance and transparency.",
  knowsAbout: [
    "California CCLD regulations",
    "Care facility citation defense",
    "Regulatory rebuttal publishing",
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={ngoSchema} />
      <main id="main-content">
        <HeroSection />
        <StatsSection />
        <ValuePropositionSection />
        <HowItWorksSection />
        <RecentFacilitiesSection />
        <AboutSection />
        <PricingPreviewSection />
        <DisclaimerBanner />
        <DisclaimerCallout />
      </main>
    </>
  );
}
