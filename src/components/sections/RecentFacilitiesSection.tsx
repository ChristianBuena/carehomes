import Link from "next/link";
import { MapPin, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getRecentFacilities } from "@/services/facility.service";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { cache } from "react";

const getTotalFacilityCount = cache(async () => {
  return prisma.facility.count();
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function RecentFacilitiesSection() {
  const [facilities, totalCount] = await Promise.all([
    getRecentFacilities(3),
    getTotalFacilityCount(),
  ]);

  return (
    <section
      aria-labelledby="recent-facilities-heading"
      className="bg-[var(--color-bg)] py-12 md:py-16 lg:py-24"
    >
      <ResponsiveContainer>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-[var(--color-secondary)] uppercase tracking-widest mb-2">
              Directory
            </p>
            <h2
              id="recent-facilities-heading"
              className="text-3xl font-extrabold text-[var(--color-primary)] tracking-tight"
            >
              Recently Updated Facilities
            </h2>
            <p className="mt-2 text-[var(--color-muted)] text-base">
              Facilities with the most recent rebuttal or record activity.
            </p>
          </div>
          <Link
            href="/facilities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors group shrink-0 min-h-[44px]"
          >
            View full directory
            <ArrowRight
              className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Cards */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list">
          {facilities.map((facility) => (
            <li key={facility.id}>
              <Link
                href={`/facilities/${facility.slug}`}
                className="group flex flex-col h-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all"
                aria-label={`View ${facility.name} in ${facility.city}`}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      facility.status === "active"
                        ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {facility.status === "active" ? "Active" : "Inactive"}
                  </span>
                  <time
                    dateTime={facility.lastUpdated}
                    className="text-xs text-[var(--color-muted)]"
                  >
                    Updated {formatDate(facility.lastUpdated)}
                  </time>
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors leading-snug mb-2">
                  {facility.name}
                </h3>

                {/* Location */}
                <p className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] mb-4">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {facility.city}, {facility.county} County
                </p>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {facility.rebuttalsCount === 0
                      ? "No rebuttals"
                      : `${facility.rebuttalsCount} rebuttal${facility.rebuttalsCount !== 1 ? "s" : ""}`}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition-colors">
                    View profile →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/facilities"
            className="inline-flex items-center justify-center gap-2 bg-[var(--color-primary)] text-[var(--color-surface)] font-semibold px-6 min-h-[44px] rounded-full hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm"
          >
            Browse all {totalCount} facilities
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
