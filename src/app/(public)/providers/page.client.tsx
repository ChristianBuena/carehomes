"use client";

import { useMemo } from "react";
import { providers } from "@/lib/mock-data/providers";
import { DisclaimerCallout } from "@/components/ui/DisclaimerCallout";
import { ProviderList } from "@/components/providers/ProviderList";
import { ProviderFilters } from "@/components/providers/ProviderFilters";
import { ProviderDisclaimerSection } from "@/components/providers/ProviderDisclaimerSection";
import { useProviderFilters } from "@/hooks/useProviderFilters";

export default function ProvidersClientPage() {
  const { type, county, search, clearFilters } = useProviderFilters();

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesSearch =
        search === "" ||
        provider.name.toLowerCase().includes(search.toLowerCase()) ||
        provider.specialty.toLowerCase().includes(search.toLowerCase()) ||
        provider.location.toLowerCase().includes(search.toLowerCase());

      const matchesType = type === "all" || provider.type === type;
      const matchesCounty = county === "all" || provider.county === county;

      return matchesSearch && matchesType && matchesCounty;
    });
  }, [search, type, county]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary)] sm:text-4xl">
            Provider Directory
          </h1>
          <p className="text-lg text-[var(--color-muted)] max-w-3xl">
            Find independent attorneys and paralegals specializing in CCLD regulatory compliance, citation defense, and facility operations in California.
          </p>
        </div>

        <DisclaimerCallout variant="warning" className="mb-8">
          Listings on this page are provided as a neutral reference only. CareHomesSupportDocs.org does not endorse, vet, or have any financial relationship with listed providers. This is not a referral service. Always conduct your own due diligence. Using this directory does not create an attorney-client relationship.
        </DisclaimerCallout>

        <ProviderFilters providers={providers} />
        
        <ProviderList
          providers={filteredProviders}
          query={search || undefined}
          onClearFilters={clearFilters}
        />
      </div>
      <ProviderDisclaimerSection />
    </>
  );
}
