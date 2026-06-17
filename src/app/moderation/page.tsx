import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { ShieldAlert, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import { RebuttalActionCard } from "./RebuttalActionCard";

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

  // Fetch pending rebuttals
  const pendingRebuttals = await prisma.rebuttal.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true, email: true } },
      facility: { select: { name: true, slug: true, facilityNumber: true } },
    },
    orderBy: { createdAt: "asc" }, // Oldest first
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
          
          <div className="flex items-center gap-3">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {pendingRebuttals.length} Pending
              </span>
            </div>
            <Link
              href="/moderation/access-review"
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm hover:border-[var(--color-secondary)] transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-[var(--color-secondary)]" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {reviewNeededCount} Review{reviewNeededCount !== 1 ? "s" : ""} Needed
              </span>
            </Link>
          </div>
        </div>

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
