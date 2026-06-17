import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFacilityBySlug } from "@/services/facility.service";
import { buildMetadata } from "@/lib/metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  MapPin,
  Users,
  Hash,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { OfficialRecordSection } from "@/components/facilities/OfficialRecordSection";
import { ApprovedRebuttalsSection } from "@/components/facilities/ApprovedRebuttalsSection";
import type { Rebuttal as RebuttalCardType } from "@/components/facilities/ApprovedRebuttalsSection";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

// Add getUserFromRequest import at the top
import { getUserFromRequest } from "@/lib/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacilityBySlug(slug);
  if (!facility) {
    return { title: "Facility Not Found | CareHomesSupportDocs.org" };
  }
  const name = facility.name;
  const city = facility.city ?? facility.address.split(",")[1]?.trim() ?? facility.address;

  return buildMetadata({
    title: `${name} — ${city}, CA`,
    description: `View the official CCLD record and published rebuttals for ${name} in ${city}, California.`,
    openGraph: {
      title: `${name} | CareHomesSupportDocs.org`,
      description: `Licensed California care facility in ${city}. View rebuttals and official CCLD records.`,
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
  const facility = await getFacilityBySlug(slug);

  if (!facility) notFound();

  // Get User and Membership state for dynamic CTA buttons
  const user = await getUserFromRequest();
  let hasActiveMembership = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { membership: true },
    });
    hasActiveMembership = dbUser?.membership?.status === "ACTIVE";
  }

  const city = facility.city ?? facility.address.split(",")[1]?.trim() ?? facility.address;

  // Fetch approved rebuttals for THIS facility only
  const dbRebuttals = await prisma.rebuttal.findMany({
    where: { facilityId: facility.id, status: "APPROVED" },
    include: { user: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Map DB shape → ApprovedRebuttalsSection's Rebuttal type (no `as any`)
  const publishedRebuttals: RebuttalCardType[] = dbRebuttals.map((r) => ({
    id: r.id,
    title: r.title,
    citationId: `REB-${r.id.slice(-6).toUpperCase()}`,
    citationDate: r.createdAt.toISOString(),
    summary: r.content,
    moderationStatus: "approved" as const,
    publishedAt: r.updatedAt.toISOString(),
    filesUrl: undefined,
  }));

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: facility.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressRegion: "CA",
    },
  };

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* ── Breadcrumb bar ─────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <ResponsiveContainer className="py-3">
          <Breadcrumb
            items={[
              { label: "Facilities", href: "/facilities" },
              { label: facility.name },
            ]}
          />
          <div className="mt-2">
            <BackButton />
          </div>
        </ResponsiveContainer>
      </div>

      {/* ── Facility Header ────────────────────────────────────────────── */}
      <header className="bg-[var(--color-primary)] text-[var(--color-surface)]">
        <ResponsiveContainer className="py-12 md:py-16 lg:py-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Left: name + metadata */}
            <div>
              {/* Status badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 bg-[var(--color-success)]/20 text-[var(--color-success)] border border-[var(--color-success)]/20 px-3 py-1 rounded-full text-sm font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Active Facility
                </span>
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
                {/* // TODO: [nice-to-have] Increase padding and text size for metadata pills */}
                <div
                  role="listitem"
                  className="inline-flex items-center gap-2 bg-[var(--color-surface)]/10 text-[var(--color-surface)]/80 px-3 py-1.5 rounded-lg text-sm"
                >
                  <MapPin className="h-4 w-4 text-[var(--color-surface)]/60" aria-hidden="true" />
                  <span>
                    {city}, CA
                  </span>
                </div>
                {facility.capacity != null && (
                  <div
                    role="listitem"
                    className="inline-flex items-center gap-2 bg-[var(--color-surface)]/10 text-[var(--color-surface)]/80 px-3 py-1.5 rounded-lg text-sm"
                  >
                    <Users className="h-4 w-4 text-[var(--color-surface)]/60" aria-hidden="true" />
                    <span>Capacity: {facility.capacity}</span>
                  </div>
                )}
                {facility.facilityNumber && (
                  <div
                    role="listitem"
                    className="inline-flex items-center gap-2 bg-[var(--color-surface)]/10 text-[var(--color-surface)]/80 px-3 py-1.5 rounded-lg text-sm font-mono"
                  >
                    <Hash className="h-4 w-4 text-[var(--color-surface)]/60" aria-hidden="true" />
                    <span>{facility.facilityNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: CTA */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="h-12 px-6 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-[var(--color-surface)] font-semibold shadow-md group"
              >
                <Link href={hasActiveMembership ? "/dashboard/rebuttals/new" : "/login"}>
                  {hasActiveMembership ? "Submit Rebuttal" : "Submit Rebuttal (Members)"}
                  <ArrowRight
                    className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                    aria-hidden="true"
                  />
                </Link>
              </Button>
              {!hasActiveMembership && (
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
                >
                  <Link href="/pricing">Join to Claim Facility</Link>
                </Button>
              )}
            </div>
          </div>
        </ResponsiveContainer>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <ResponsiveContainer className="mt-10 space-y-12">
        {/* 3. Disclaimer callout */}
        <aside
          className="bg-[var(--color-primary)]/5 border border-[var(--color-border)] rounded-2xl p-6 flex gap-4 items-start shadow-sm mb-12"
          aria-label="Legal disclaimer"
        >
          <Info
            className="h-5 w-5 text-[var(--color-primary)] shrink-0 mt-0.5"
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

        {/* 1. Official Record */}
        <OfficialRecordSection
          ccldLink={facility.ccldLink ?? null}
          facilityName={facility.name}
        />

        {/* 2. Approved Rebuttals */}
        <ApprovedRebuttalsSection rebuttals={publishedRebuttals} />
      </ResponsiveContainer>
    </div>
    </>
  );
}
