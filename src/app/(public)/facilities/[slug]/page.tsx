import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  MapPin,
  Users,
  Hash,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { MOCK_FACILITIES } from "@/lib/mock-data/facilities";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { OfficialRecordSection } from "@/components/facilities/OfficialRecordSection";
import { ApprovedRebuttalsSection } from "@/components/facilities/ApprovedRebuttalsSection";
import { Button } from "@/components/ui/button";

// ─── Static generation ────────────────────────────────────────────────────────

export function generateStaticParams() {
  return MOCK_FACILITIES.map((f) => ({ slug: f.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = MOCK_FACILITIES.find((f) => f.slug === slug);
  if (!facility) {
    return { title: "Facility Not Found | CareHomesSupportDocs.org" };
  }
  return buildMetadata({
    title: `${facility.name} — ${facility.city}, CA`,
    description: `View the official CCLD record and ${facility.rebuttalsCount} published rebuttal${facility.rebuttalsCount !== 1 ? "s" : ""} for ${facility.name} in ${facility.city}, ${facility.county} County, California.`,
    openGraph: {
      title: `${facility.name} | CareHomesSupportDocs.org`,
      description: `Licensed California care facility in ${facility.city}, ${facility.county} County. View rebuttals and official CCLD records.`,
      type: "website",
    },
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FacilityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const facility = MOCK_FACILITIES.find((f) => f.slug === slug);
  if (!facility) notFound();

  const isActive = facility.status === "active";

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: facility.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: facility.city,
      addressRegion: "CA",
    },
  };

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* ── Breadcrumb bar ─────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumb
            items={[
              { label: "Facilities", href: "/facilities" },
              { label: facility.name },
            ]}
          />
        </div>
      </div>

      {/* ── Facility Header ────────────────────────────────────────────── */}
      <header className="bg-[var(--color-primary)] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Left: name + metadata */}
            <div>
              {/* Status badge */}
              <div className="mb-4">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 bg-[var(--color-success)]/20 text-green-300 border border-green-400/20 px-3 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Active Facility
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/60 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Inactive
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-5 text-balance">
                {facility.name}
              </h1>

              {/* Metadata pills */}
              <div
                className="flex flex-wrap gap-3"
                role="list"
                aria-label="Facility details"
              >
                <div
                  role="listitem"
                  className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-3 py-1.5 rounded-lg text-sm"
                >
                  <MapPin className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span>
                    {facility.city}, {facility.county} County
                  </span>
                </div>
                <div
                  role="listitem"
                  className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-3 py-1.5 rounded-lg text-sm"
                >
                  <Users className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span>Capacity: {facility.capacity}</span>
                </div>
                <div
                  role="listitem"
                  className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-3 py-1.5 rounded-lg text-sm font-mono"
                >
                  <Hash className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span>{facility.facilityNumber}</span>
                </div>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="shrink-0">
              <Button
                asChild
                className="h-12 px-6 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-text)] font-semibold shadow-md group"
              >
                <Link href="/login">
                  Member? Submit a Rebuttal
                  <ArrowRight
                    className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10 space-y-12">
        {/* 1. Official Record */}
        <OfficialRecordSection
          ccldLink={facility.ccldLink ?? null}
          facilityName={facility.name}
        />

        {/* 2. Approved Rebuttals */}
        <ApprovedRebuttalsSection rebuttals={[]} />

        {/* 3. Disclaimer callout */}
        <aside
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex gap-4 items-start shadow-sm"
          aria-label="Legal disclaimer"
        >
          <AlertCircle
            className="h-5 w-5 text-[var(--color-warning)] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-1.5 text-sm text-[var(--color-text)]">
            <p className="font-semibold text-[var(--color-primary)]">
              Important Disclaimer
            </p>
            <p className="leading-relaxed">
              CareHomesSupportDocs.org is an independent nonprofit. We are not affiliated
              with the CCLD or any government agency. Facility data and rebuttals
              published here may not be current — always verify at{" "}
              <a
                href="https://www.ccld.dss.ca.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-[var(--color-primary)] transition-colors"
              >
                official CCLD sources
              </a>
              . Nothing on this site constitutes legal advice.
            </p>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
