import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const metadata = {
  title: "My Rebuttals — Dashboard",
  description: "View and manage all rebuttals you have submitted.",
};

const STATUS_CONFIG = {
  APPROVED: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  },
  PENDING: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",
  },
} as const;

export default async function MyRebuttalsPage() {
  const user = await getUserFromRequest();
  if (!user) redirect("/login");

  const rebuttals = await prisma.rebuttal.findMany({
    where: { userId: user.userId },
    include: {
      facility: {
        select: { id: true, name: true, slug: true, city: true, county: true },
      },
      moderatedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">My Rebuttals</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            {rebuttals.length} rebuttal{rebuttals.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
      </div>

      {rebuttals.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-12 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-[var(--color-muted)] mx-auto mb-4" aria-hidden="true" />
          <p className="text-lg font-semibold text-[var(--color-text)]">No rebuttals yet</p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Once you submit a rebuttal it will appear here for tracking.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Rebuttal list">
          {rebuttals.map((rebuttal) => {
            const statusKey = rebuttal.status as keyof typeof STATUS_CONFIG;
            const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;

            return (
              <li
                key={rebuttal.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm hover:border-[var(--color-primary)]/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--color-text)] leading-snug line-clamp-2">
                      {rebuttal.title}
                    </h3>
                    {rebuttal.facility && (
                      <p className="text-sm text-[var(--color-muted)] mt-1">
                        {rebuttal.facility.name} — {rebuttal.facility.city},{" "}
                        {rebuttal.facility.county} County
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-muted)]/70 mt-2">
                      Submitted {new Date(rebuttal.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      {rebuttal.moderatedBy?.name && (
                        <> · Reviewed by {rebuttal.moderatedBy.name}</>
                      )}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${cfg.className}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {cfg.label}
                  </span>
                </div>

                {rebuttal.status === "APPROVED" && rebuttal.facility && (
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <Link
                      href={`/facilities/${rebuttal.facility.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      View published on facility page
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
