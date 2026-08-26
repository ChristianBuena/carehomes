import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, MapPin, Users, ExternalLink, AlertCircle, Hash } from "lucide-react";

export const metadata = {
  title: "My Facilities — Dashboard",
  description: "View and manage the care facilities you have registered.",
};

export default async function MyFacilitiesPage() {
  const user = await getUserFromRequest();
  if (!user) redirect("/login");

  const [facilities, membership] = await Promise.all([
    prisma.facility.findMany({
      where: { createdById: user.userId, deletedAt: null },
      include: {
        _count: { select: { rebuttals: { where: { status: "APPROVED", deletedAt: null } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.membership.findUnique({ where: { organizationId: user.orgId } }),
  ]);

  const maxFacilities = membership?.maxFacilities ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">My Facilities</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              {facilities.length} of {maxFacilities} facility slot{maxFacilities !== 1 ? "s" : ""} used
            </p>
          </div>
        </div>

        {/* Quota bar */}
        {maxFacilities > 0 && (
          <div className="flex flex-col gap-1 min-w-[160px]">
            <div className="flex justify-between text-xs text-[var(--color-muted)]">
              <span>Quota</span>
              <span className="font-medium">{facilities.length}/{maxFacilities}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-border)]" role="progressbar" aria-valuenow={facilities.length} aria-valuemax={maxFacilities}>
              <div
                className="h-2 rounded-full bg-[var(--color-secondary)] transition-all"
                style={{ width: `${Math.min((facilities.length / maxFacilities) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {facilities.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-[var(--color-muted)] mx-auto mb-4" aria-hidden="true" />
          <p className="text-lg font-semibold text-[var(--color-text)]">No facilities registered</p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {maxFacilities === 0
              ? "Upgrade your membership to register facilities."
              : "Browse the public directory and register your facilities."}
          </p>
          <Link
            href={maxFacilities === 0 ? "/pricing" : "/facilities"}
            className="inline-block mt-4 px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            {maxFacilities === 0 ? "View Plans" : "Browse Directory"}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Facility list">
          {facilities.map((facility) => (
            <li
              key={facility.id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm hover:border-[var(--color-primary)]/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--color-text)] text-lg leading-snug">
                    {facility.name}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-muted)]">
                    {facility.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {facility.city}{facility.county ? `, ${facility.county} County` : ""}
                      </span>
                    )}
                    {facility.capacity != null && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        Capacity: {facility.capacity}
                      </span>
                    )}
                    {facility.facilityNumber && (
                      <span className="flex items-center gap-1 font-mono text-xs">
                        <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                        {facility.facilityNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted)]/70 mt-2">
                    {facility._count.rebuttals} approved rebuttal{facility._count.rebuttals !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/facilities/${facility.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg hover:bg-[var(--color-primary)]/5 transition-colors"
                  >
                    View Public Page
                  </Link>
                  {facility.ccldLink && (
                    <a
                      href={facility.ccldLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                      aria-label={`CCLD record for ${facility.name} (opens in new tab)`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      CCLD
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
