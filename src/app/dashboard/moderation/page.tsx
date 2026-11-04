import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ShieldAlert, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { RebuttalActionCard } from "./RebuttalActionCard";
import { ApprovedCopyRetry } from "./ApprovedCopyRetry";

export const metadata = {
  title: "Moderation Dashboard",
  description: "Review and moderate pending facility rebuttals.",
};

export default async function ModerationPage() {
  const user = await getUserFromRequest();
  
  if (!user) {
    redirect("/login");
  }

  // Check permissions (must be ADMIN or MODERATOR)
  if (!hasPermission(user.role, "moderate_rebuttals")) {
    redirect("/dashboard");
  }

  // Fetch pending rebuttals (excluding soft-deleted)
  // Explicit select: these rows are passed to a client component, so every
  // field here ends up in the browser. Storage URLs stay on the server
  // (SOW 11.3); the document opens through /api/rebuttal/[id]/document.
  const pendingRebuttals = (
    await prisma.rebuttal.findMany({
      where: { status: "PENDING", deletedAt: null },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        createdAt: true,
        documentUrl: true,
        // Private signer details: shown to moderators, never published.
        signerName: true,
        signedOn: true,
        visitDate: true,
        user: { select: { name: true, email: true } },
        facility: { select: { name: true, slug: true, facilityNumber: true } },
      },
      orderBy: { createdAt: "asc" }, // Oldest first
    })
  ).map(({ documentUrl, ...r }) => ({ ...r, hasDocument: documentUrl !== null }));

  // Approved rebuttals whose approved copy could not be made (SOW 11.2).
  const failedCopies = await prisma.rebuttal.findMany({
    where: { status: "APPROVED", deletedAt: null, watermarkStatus: "FAILED" },
    select: { id: true, title: true, watermarkError: true, watermarkUpdatedAt: true },
    orderBy: { watermarkUpdatedAt: "desc" },
  });

  // Quarterly access review count
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const reviewNeededCount = await prisma.user.count({
    where: {
      OR: [
        { lastReviewedAt: null },
        { lastReviewedAt: { lt: ninetyDaysAgo } },
      ],
    },
  });

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors mb-3"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-[var(--color-warning)]" aria-hidden="true" />
              Moderation Queue
            </h1>
            <p className="mt-2 text-[var(--color-muted)]">
              Review and moderate pending rebuttals before they are published to public facility pages.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {pendingRebuttals.length} Pending
              </span>
            </div>
            <Link
              href="/dashboard/incidents"
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm hover:border-[var(--color-warning)] transition-colors"
            >
              <ShieldAlert className="h-4 w-4 text-[var(--color-warning)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                72h SLA Incidents
              </span>
            </Link>
            <Link
              href="/dashboard/moderation/access-review"
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm hover:border-[var(--color-secondary)] transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--color-secondary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {reviewNeededCount} Review{reviewNeededCount !== 1 ? "s" : ""} Needed
              </span>
            </Link>
          </div>
        </div>

        {failedCopies.length > 0 && (
          <section
            aria-labelledby="failed-copies-heading"
            className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-surface)] p-6 shadow-sm"
          >
            <h2 id="failed-copies-heading" className="text-lg font-bold text-[var(--color-text)]">
              Approved copies that need attention ({failedCopies.length})
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              These rebuttals were approved, but the &ldquo;PUBLIC REDACTED VERSION&rdquo; copy of their document could not be made.
            </p>
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {failedCopies.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{r.title}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Reason: {r.watermarkError ?? "unknown"}
                      {r.watermarkUpdatedAt && ` · ${r.watermarkUpdatedAt.toLocaleString("en-US")}`}
                    </p>
                  </div>
                  <ApprovedCopyRetry rebuttalId={r.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Content */}
        {pendingRebuttals.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" aria-hidden="true" />
            <p className="text-xl font-bold text-[var(--color-text)]">Queue is empty</p>
            <p className="text-[var(--color-muted)] mt-2">
              All pending rebuttals have been reviewed. Great job!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingRebuttals.map((rebuttal) => (
              <RebuttalActionCard key={rebuttal.id} rebuttal={rebuttal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
