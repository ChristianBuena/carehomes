import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await getUserFromRequest();

  if (!user) {
    redirect("/login");
  }

  const [dbUser, rebuttalCount, facilityCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      include: { membership: true },
    }),
    prisma.rebuttal.count({ where: { userId: user.userId } }),
    prisma.facility.count({ where: { createdById: user.userId } }),
  ]);

  if (!dbUser) {
    redirect("/login");
  }

  const { membership } = dbUser;

  const isModeratorOrAdmin = dbUser.role === "ADMIN" || dbUser.role === "MODERATOR";
  const hasActiveMembership = membership?.status === "ACTIVE";

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary)] flex items-center gap-3">
              Welcome, {dbUser.name || dbUser.email}
              <Badge variant="outline" className="bg-[var(--color-surface)] text-[var(--color-primary)]">
                {dbUser.role}
              </Badge>
            </h1>
            <p className="mt-2 text-[var(--color-muted)]">
              Manage your care homes, rebuttals, and platform membership.
            </p>
          </div>
          {isModeratorOrAdmin && (
            <Button asChild variant="outline" className="shrink-0 border-[var(--color-secondary)] text-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/10">
              <Link href="/moderation">Moderation Dashboard</Link>
            </Button>
          )}
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
            <p className="text-3xl font-bold text-[var(--color-primary)]">{rebuttalCount}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {rebuttalCount === 1 ? "Rebuttal" : "Rebuttals"} Submitted
            </p>
          </Card>
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
            <p className="text-3xl font-bold text-[var(--color-primary)]">{facilityCount}</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {facilityCount === 1 ? "Facility" : "Facilities"} Registered
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-[var(--color-primary)]">Membership Status</h2>
            {membership ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Current Plan</span>
                  <span className="font-medium text-[var(--color-text)]">{membership.plan}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Status</span>
                  <Badge 
                    variant={hasActiveMembership ? "default" : "secondary"}
                    className={hasActiveMembership ? "bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]" : ""}
                  >
                    {membership.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Facilities Allowed</span>
                  <span className="font-medium text-[var(--color-text)]">{membership.maxFacilities}</span>
                </div>
                {membership.nextBillingDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--color-muted)]">Next Billing Date</span>
                    <span className="text-[var(--color-text)]">
                      {new Date(membership.nextBillingDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {!hasActiveMembership && (
                  <div className="mt-6">
                    <Button asChild className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-white">
                      <Link href="/pricing">Upgrade Your Plan</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[var(--color-muted)] text-sm">
                  You currently do not have an active membership plan.
                </p>
                <Button asChild className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-white">
                  <Link href="/pricing">View Plans &amp; Upgrade</Link>
                </Button>
              </div>
            )}
          </Card>

          <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-[var(--color-primary)]">Quick Links</h2>
            <div className="space-y-3 flex flex-col">
              <Button asChild variant="outline" className="justify-start w-full">
                <Link href="/dashboard/rebuttals">
                  My Rebuttals
                  <span className="ml-auto text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                    {rebuttalCount}
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start w-full">
                <Link href="/dashboard/facilities">
                  My Facilities
                  <span className="ml-auto text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                    {facilityCount}
                  </span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start w-full">
                <Link href="/facilities">Browse Facility Directory</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}