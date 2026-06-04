"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Mail, Globe, MapPin, Scale, Search, Briefcase } from "lucide-react";

import { Provider, providers } from "@/lib/mock-data/providers";
import { DisclaimerCallout } from "@/components/ui/DisclaimerCallout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProvidersClientPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [countyFilter, setCountyFilter] = useState<string>("all");

  const uniqueCounties = useMemo(() => {
    const counties = new Set(providers.map((p) => p.county));
    return Array.from(counties).sort();
  }, []);

  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const matchesSearch =
        searchQuery === "" ||
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || provider.type === typeFilter;
      const matchesCounty = countyFilter === "all" || provider.county === countyFilter;

      return matchesSearch && matchesType && matchesCounty;
    });
  }, [searchQuery, typeFilter, countyFilter]);

  return (
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

      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
            <Input
              type="text"
              placeholder="Search by name, specialty, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full"
            />
          </div>
          
          <div className="md:col-span-3">
             <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="All Provider Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provider Types</SelectItem>
                <SelectItem value="attorney">Attorney</SelectItem>
                <SelectItem value="paralegal">Paralegal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3">
             <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {uniqueCounties.map((county) => (
                  <SelectItem key={county} value={county}>
                    {county} County
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredProviders.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          heading="No providers found"
          description="We couldn't find any providers matching your current filters. Try adjusting your search criteria."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setCountyFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProviders.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const isAttorney = provider.type === "attorney";

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4 mb-2">
          <CardTitle className="text-xl text-[var(--color-primary)]">
            {provider.name}
          </CardTitle>
          <Badge
            variant={isAttorney ? "default" : "secondary"}
            className={
              isAttorney
                ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                : "bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-white"
            }
          >
            {isAttorney ? (
              <Scale className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="capitalize">{provider.type}</span>
          </Badge>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[var(--color-muted)]">
          <div className="font-medium text-[var(--color-text)]">
            {provider.specialty}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" />
            {provider.location}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        <p className="text-sm text-[var(--color-text)] leading-relaxed">
          {provider.bio}
        </p>
      </CardContent>

      <CardFooter className="pt-4 border-t border-[var(--color-border)] bg-[var(--color-bg)] rounded-b-xl flex flex-wrap gap-3">
        {provider.contactEmail && (
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <a href={`mailto:${provider.contactEmail}`}>
              <Mail className="w-4 h-4 mr-2" />
              Email Provider
            </a>
          </Button>
        )}
        {provider.website && (
          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
            <a href={provider.website} target="_blank" rel="noopener noreferrer">
              <Globe className="w-4 h-4 mr-2" />
              Visit Website
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
