import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  MapPin,
  Users,
  FileText,
  ArrowLeft,
  CalendarDays,
  Hash,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { MOCK_FACILITIES } from "@/lib/mock-data/facilities";
import { Button } from "@/components/ui/button";

// ─── Static params for SSG ────────────────────────────────────────────────────

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
  if (!facility) return { title: "Facility Not Found | CareHomesSupportDocs.org" };

  return {
    title: `${facility.name} | CareHomesSupportDocs.org`,
    description: `View CCLD records, citation history, and published rebuttals for ${facility.name} in ${facility.city}, ${facility.county} County.`,
  };
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

  return (
    <div className="bg-[var(--color-bg)] min-h-screen pb-24">
      {/* Back breadcrumb */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <Link
            href="/facilities"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Facility Directory
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <header className="bg-[var(--color-primary)] text-white py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-4">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 bg-[var(--color-success)]/20 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/60 px-3 py-1 rounded-full text-xs font-semibold">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Inactive
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
                {facility.name}
              </h1>
              <p className="text-white/70 text-lg">
                {facility.city}, {facility.county} County
              </p>
            </div>

            <div className="shrink-0">
              <a
                href={facility.ccldLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                aria-label={`View ${facility.name} on CCLD (opens in new tab)`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View Official CCLD Record
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 text-[var(--color-text)] px-4 py-3 rounded-lg text-sm mb-8">
          <AlertCircle className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            This is not a government source. Always verify facility records at the{" "}
            <a
              href={facility.ccldLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-[var(--color-primary)]"
            >
              official CCLD portal
            </a>
            .
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left: Details sidebar ─────────────────────────────── */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Facility Info Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                Facility Information
              </h2>

              <dl className="space-y-4">
                <div className="flex gap-3">
                  <dt className="sr-only">License Number</dt>
                  <Hash className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[var(--color-muted)] font-medium">License #</p>
                    <dd className="text-sm font-mono text-[var(--color-text)]">
                      {facility.facilityNumber}
                    </dd>
                  </div>
                </div>

                <div className="flex gap-3">
                  <dt className="sr-only">Location</dt>
                  <MapPin className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[var(--color-muted)] font-medium">Location</p>
                    <dd className="text-sm text-[var(--color-text)]">
                      {facility.city}, {facility.county} County
                    </dd>
                  </div>
                </div>

                <div className="flex gap-3">
                  <dt className="sr-only">Capacity</dt>
                  <Users className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[var(--color-muted)] font-medium">Licensed Capacity</p>
                    <dd className="text-sm text-[var(--color-text)]">
                      {facility.capacity} residents
                    </dd>
                  </div>
                </div>

                <div className="flex gap-3">
                  <dt className="sr-only">Last Updated</dt>
                  <CalendarDays className="h-4 w-4 text-[var(--color-muted)] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[var(--color-muted)] font-medium">Record Last Updated</p>
                    <dd className="text-sm text-[var(--color-text)]">
                      {new Date(facility.lastUpdated).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Rebuttal Summary Card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-4">
                Rebuttals
              </h2>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[var(--color-secondary)]" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-extrabold text-[var(--color-text)]">
                    {facility.rebuttalsCount}
                  </p>
                  <p className="text-sm text-[var(--color-muted)]">
                    published rebuttal{facility.rebuttalsCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Card for members */}
            <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-[var(--color-primary)] mb-2">
                Are you this facility's operator?
              </h2>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                Join as a member to submit and publish rebuttals for this facility.
              </p>
              <Button asChild size="sm" className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-text)] font-semibold">
                <Link href="/pricing">Join as a Member</Link>
              </Button>
            </div>
          </aside>

          {/* ── Right: Rebuttals ──────────────────────────────────── */}
          <main className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                Published Rebuttals
              </h2>
              {facility.rebuttalsCount > 0 && (
                <span className="text-sm text-[var(--color-muted)]">
                  {facility.rebuttalsCount} total
                </span>
              )}
            </div>

            {facility.rebuttalsCount === 0 ? (
              /* Empty state */
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <FileText className="h-12 w-12 text-[var(--color-border)] mb-4" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                  No rebuttals published yet
                </h3>
                <p className="text-[var(--color-muted)] text-sm max-w-xs">
                  This facility has no published rebuttals. If you operate this facility, join as a member to respond to citations.
                </p>
              </div>
            ) : (
              /* Placeholder rebuttal cards — real data would come from API */
              <div className="space-y-4">
                {Array.from({ length: facility.rebuttalsCount }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <span className="text-xs font-mono text-[var(--color-muted)] bg-[var(--color-bg)] px-2 py-0.5 rounded">
                          Citation #{String(1000 + i).padStart(5, "0")}
                        </span>
                        <h3 className="text-base font-semibold text-[var(--color-text)] mt-2">
                          Rebuttal to Citation — Title 22, §87465
                        </h3>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)]">
                        Approved
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed line-clamp-3">
                      [Rebuttal content will appear here once loaded from the database. This is a placeholder for the published member response to the regulatory citation.]
                    </p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-muted)]">
                      <span>Published: Jan {10 + i}, 2026</span>
                      <a
                        href={facility.ccldLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-[var(--color-secondary)] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        CCLD Source
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
