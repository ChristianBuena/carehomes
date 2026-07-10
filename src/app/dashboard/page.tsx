import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Building2, FileText, ClipboardCheck, Settings, CreditCard, PlusCircle } from "lucide-react";
import { hasPermission, canClaimFacility } from "@/lib/permissions";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const user = await getUserFromRequest();

  if (!user || !user.role) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    include: { membership: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const { membership } = dbUser;
  const hasActiveMembership = membership?.status === "ACTIVE";

  // Data fetching based on role
  let rebuttalCount = 0;
  let facilityCount = 0;
  let totalUsers = 0;
  let totalFacilities = 0;
  let totalRebuttals = 0;
  let pendingModeration = 0;
  let reviewedThisMonth = 0;

  if (dbUser.role === "MEMBER") {
    [rebuttalCount, facilityCount] = await Promise.all([
      prisma.rebuttal.count({ where: { userId: user.userId } }),
      prisma.facility.count({ where: { createdById: user.userId } }),
    ]);
  } else if (dbUser.role === "ADMIN") {
    [totalUsers, totalFacilities, totalRebuttals, pendingModeration] = await Promise.all([
      prisma.user.count(),
      prisma.facility.count(),
      prisma.rebuttal.count(),
      prisma.rebuttal.count({ where: { status: "PENDING" } }),
    ]);
  } else if (dbUser.role === "MODERATOR") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    [pendingModeration, reviewedThisMonth] = await Promise.all([
      prisma.rebuttal.count({ where: { status: "PENDING" } }),
      prisma.rebuttal.count({
        where: {
          updatedAt: { gte: startOfMonth },
          status: { not: "PENDING" },
        },
      }),
    ]);
  }

  const canClaim = membership && hasActiveMembership ? canClaimFacility(membership.plan, facilityCount) : false;

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
              {dbUser.role === "MEMBER" 
                ? "Manage your care homes, rebuttals, and platform membership." 
                : dbUser.role === "ADMIN" 
                ? "Platform administration and oversight." 
                : "Review and moderate facility rebuttals."}
            </p>
          </div>
        </header>

        {success === "true" && (
          <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)] px-4 py-3 rounded-lg text-sm flex items-start gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>
              <strong>Payment successful!</strong> Your subscription has been processed. Your membership status will update momentarily.
            </span>
          </div>
        )}

        {/* =========================================
            MEMBER DASHBOARD
        ========================================= */}
        {dbUser.role === "MEMBER" && (
          <>
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

              <div className="space-y-6">
                {hasPermission(dbUser.role, "claim_facility") && (
                  <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-[var(--color-primary)] flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[var(--color-secondary)]" /> My Facilities
                      </h2>
                      <Badge variant="secondary" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {facilityCount} Owned
                      </Badge>
                    </div>
                    {hasActiveMembership ? (
                      canClaim ? (
                        <Button asChild className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white group">
                          <Link href="/facilities">
                            <PlusCircle className="w-4 h-4 mr-2" /> Claim a Facility
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled className="w-full bg-[var(--color-border)] text-[var(--color-muted)]" title="Facility limit reached for your plan">
                          Facility limit reached
                        </Button>
                      )
                    ) : (
                      <p className="text-sm text-[var(--color-muted)]">Active membership required to claim facilities.</p>
                    )}
                  </Card>
                )}

                {hasPermission(dbUser.role, "submit_rebuttal") && (
                  <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-[var(--color-primary)] flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[var(--color-secondary)]" /> My Rebuttals
                      </h2>
                      <Badge variant="secondary" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {rebuttalCount} Submitted
                      </Badge>
                    </div>
                    {hasActiveMembership && facilityCount > 0 ? (
                      <Button asChild className="w-full bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover)] text-white group">
                        <Link href="/dashboard/rebuttals/new">
                          <PlusCircle className="w-4 h-4 mr-2" /> Submit New Rebuttal
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full bg-[var(--color-border)] text-[var(--color-muted)]" title={facilityCount === 0 ? "You must own a facility to submit a rebuttal." : "Active membership required."}>
                        {facilityCount === 0 ? "Claim a facility first" : "Active membership required"}
                      </Button>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* =========================================
            ADMIN DASHBOARD
        ========================================= */}
        {dbUser.role === "ADMIN" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
                <p className="text-3xl font-bold text-[var(--color-primary)]">{totalUsers}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Total Users</p>
              </Card>
              <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
                <p className="text-3xl font-bold text-[var(--color-primary)]">{totalFacilities}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Total Facilities</p>
              </Card>
              <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center">
                <p className="text-3xl font-bold text-[var(--color-primary)]">{totalRebuttals}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Total Rebuttals</p>
              </Card>
              <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[var(--color-warning)]/10" />
                <p className="text-3xl font-bold text-[var(--color-warning)] relative z-10">{pendingModeration}</p>
                <p className="mt-1 text-sm text-[var(--color-warning)] font-medium relative z-10">Pending Moderation</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-6 h-6 text-[var(--color-warning)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">Moderation Queue</h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">Review and publish pending rebuttals.</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/moderation">Go to Queue</Link>
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">Manage Users</h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">View and manage platform users.</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/users">Manage Users</Link>
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--color-secondary)]/10 flex items-center justify-center shrink-0">
                    <Settings className="w-6 h-6 text-[var(--color-secondary)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">Manage Facilities</h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">Edit or delete facility records.</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/facilities/manage">Manage Facilities</Link>
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-[var(--color-success)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">Memberships</h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1 mb-4">View billing and subscription tiers.</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/dashboard/memberships">Manage Memberships</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* =========================================
            MODERATOR DASHBOARD
        ========================================= */}
        {dbUser.role === "MODERATOR" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center mb-4">
                  <ClipboardCheck className="w-8 h-8 text-[var(--color-warning)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-primary)]">{pendingModeration}</h2>
                <p className="text-[var(--color-muted)] mb-6">Rebuttals Pending Review</p>
                <Button asChild className="w-full bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-white">
                  <Link href="/dashboard/moderation">Open Moderation Queue</Link>
                </Button>
              </Card>

              <Card className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-[var(--color-success)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-primary)]">{reviewedThisMonth}</h2>
                <p className="text-[var(--color-muted)]">Rebuttals Processed This Month</p>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}