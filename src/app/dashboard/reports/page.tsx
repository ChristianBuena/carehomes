import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { REVISION_CYCLE_TARGET, revisionCyclesReport, turnaroundReport } from "@/services/kpi-report.service";

export const metadata: Metadata = {
  title: "Reports",
  description: "Turnaround and revision-cycle reports (admin only).",
};

const fmt = (v: number | null, unit = "h") => (v === null ? "—" : `${v}${unit}`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <dt className="text-xs font-medium uppercase text-[var(--color-muted)]">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function ExportLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-11 items-center rounded-md border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-bg)]"
    >
      {children}
    </a>
  );
}

/** SOW 12.2 and 12.3, last 90 days. ADMIN only. */
export default async function ReportsPage() {
  const user = await getUserFromRequest();
  if (!user) redirect("/login");
  if (!hasPermission(user.role, "manage_users")) redirect("/dashboard");

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 90);
  const [turnaround, revisions] = await Promise.all([turnaroundReport({ from, to }), revisionCyclesReport({ from, to })]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 py-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">Reports</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Rebuttals submitted in the last 90 days ({from.toLocaleDateString("en-US")} to {to.toLocaleDateString("en-US")}).
          Times are calendar hours. The app records one matter type (CCLD citation rebuttal).
        </p>
      </header>

      <section aria-labelledby="turnaround-heading" className="space-y-4">
        <h2 id="turnaround-heading" className="text-xl font-semibold text-[var(--color-text)]">
          Turnaround (SOW 12.2)
        </h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Submitted" value={String(turnaround.submitted)} />
          <Stat label="Awaiting first decision" value={String(turnaround.awaitingFirstDecision)} />
          <Stat label="Median to first decision" value={fmt(turnaround.toFirstDecision.medianHours)} />
          <Stat label="Median to approval" value={fmt(turnaround.toApproval.medianHours)} />
          <Stat label="Average to first decision" value={fmt(turnaround.toFirstDecision.averageHours)} />
          <Stat label="90th percentile to first decision" value={fmt(turnaround.toFirstDecision.p90Hours)} />
          <Stat label="Average to approval" value={fmt(turnaround.toApproval.averageHours)} />
          <Stat label="Longest to approval" value={fmt(turnaround.toApproval.maxHours)} />
        </dl>
        <ExportLink href="/api/admin/reports/kpi?report=turnaround&format=csv">Download turnaround CSV</ExportLink>
      </section>

      <section aria-labelledby="revisions-heading" className="space-y-4">
        <h2 id="revisions-heading" className="text-xl font-semibold text-[var(--color-text)]">
          Revision cycles (SOW 12.3, target {REVISION_CYCLE_TARGET} or fewer)
        </h2>
        <p className="text-sm text-[var(--color-muted)]">Counts moderator &ldquo;request fix&rdquo; decisions per rebuttal.</p>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Rebuttals" value={String(revisions.rebuttals)} />
          <Stat label="Average cycles" value={fmt(revisions.averageCycles, "")} />
          <Stat label="Within target" value={String(revisions.withinTarget)} />
          <Stat label="Over target" value={String(revisions.overTarget)} />
        </dl>
        <ExportLink href="/api/admin/reports/kpi?report=revisions&format=csv">Download revision-cycle CSV</ExportLink>
      </section>

      <section aria-labelledby="audit-heading" className="space-y-2">
        <h2 id="audit-heading" className="text-xl font-semibold text-[var(--color-text)]">Audit log</h2>
        <ExportLink href="/api/admin/audit-log">Download audit log CSV</ExportLink>
      </section>
    </div>
  );
}
