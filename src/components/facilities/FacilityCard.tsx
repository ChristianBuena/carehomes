import Link from "next/link";
import { ExternalLink, MapPin, Users, FileText, ArrowRight } from "lucide-react";
import type { Facility } from "@/lib/mock-data/facilities";

interface FacilityCardProps {
  facility: Facility;
}

export function FacilityCard({ facility }: FacilityCardProps) {
  return (
    <div className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all duration-200 flex flex-col gap-4">
      {/* Header: Name + Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-[var(--color-text)] leading-snug group-hover:text-[var(--color-primary)] transition-colors">
          {facility.name}
        </h3>
        <span
          className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
            facility.status === "active"
              ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
              : "bg-[var(--color-muted)]/10 text-[var(--color-muted)]"
          }`}
        >
          {facility.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Meta info */}
      <div className="flex flex-col gap-2 text-sm text-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)]/50" aria-hidden="true" />
          <span>
            {facility.city}, {facility.county} County
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-[var(--color-primary)]/50" aria-hidden="true" />
          <span>Capacity: {facility.capacity}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]/50" aria-hidden="true" />
          <span>
            {facility.rebuttalsCount > 0 ? (
              <span className="text-[var(--color-secondary)] font-medium">
                {facility.rebuttalsCount} rebuttal{facility.rebuttalsCount !== 1 ? "s" : ""} published
              </span>
            ) : (
              "No rebuttals yet"
            )}
          </span>
        </div>
      </div>

      {/* Facility Number */}
      <p className="text-xs text-[var(--color-muted)]/70 font-mono">
        License #{facility.facilityNumber}
      </p>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-auto">
        <Link
          href={`/facilities/${facility.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors group/link"
        >
          View Facility
          <ArrowRight className="h-4 w-4 group-hover/link:translate-x-0.5 transition-transform" aria-hidden="true" />
        </Link>

        <a
          href={facility.ccldLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-secondary)] transition-colors"
          aria-label={`View ${facility.name} on CCLD (opens in new tab)`}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          CCLD Record
        </a>
      </div>
    </div>
  );
}
