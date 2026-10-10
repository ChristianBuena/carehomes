import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const testDb = new PrismaClient({ adapter });

/**
 * Truncates every application table and restarts identity sequences.
 * Run between tests so each test starts from a clean, known state.
 */
export async function resetDb() {
  await testDb.$executeRawUnsafe(`
    TRUNCATE TABLE
      "FileShareAccessLog",
      "FileShareLinkFile",
      "FileShareLink",
      "MemberFile",
      "ConsentLog",
      "TakedownRequest",
      "TemplateDownload",
      "Template",
      "ArchivedModerationLog",
      "ModerationLog",
      "CitationDeadline",
      "MfaOtp",
      "Rebuttal",
      "Facility",
      "Membership",
      "User",
      "Organization",
      "MembershipAgreement"
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectDb() {
  await testDb.$disconnect();
}

// ── Factories ────────────────────────────────────────────────────────────────

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function createOrg(opts?: { name?: string }) {
  return testDb.organization.create({
    data: { name: opts?.name ?? unique("org") },
  });
}

export async function createMembership(opts: {
  organizationId: string;
  plan?: "NONE" | "TIER_A" | "TIER_B" | "TIER_C";
  status?: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";
  maxFacilities?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}) {
  const plan = opts.plan ?? "NONE";
  const limits: Record<string, number> = { NONE: 0, TIER_A: 1, TIER_B: 3, TIER_C: 10 };
  return testDb.membership.create({
    data: {
      organizationId: opts.organizationId,
      plan,
      status: opts.status ?? "INACTIVE",
      maxFacilities: opts.maxFacilities ?? limits[plan],
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
    },
  });
}

export async function createUser(opts: {
  organizationId?: string | null;
  role?: "MEMBER" | "MODERATOR" | "ADMIN";
  email?: string;
  name?: string;
  password?: string;
}) {
  return testDb.user.create({
    data: {
      name: opts.name ?? "Test User",
      email: opts.email ?? unique("user") + "@example.com",
      password: opts.password ?? "irrelevant-hash",
      role: opts.role ?? "MEMBER",
      organizationId: opts.organizationId ?? null,
    },
  });
}

export async function createFacility(opts: {
  organizationId?: string | null;
  createdById?: string | null;
  name?: string;
  address?: string;
  deletedAt?: Date | null;
}) {
  const name = opts.name ?? unique("Facility");
  return testDb.facility.create({
    data: {
      slug: unique(name.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      name,
      address: opts.address ?? "123 Test St, Testville, CA 90000",
      organizationId: opts.organizationId ?? null,
      createdById: opts.createdById ?? null,
      deletedAt: opts.deletedAt ?? null,
    },
  });
}

export async function createRebuttal(opts: {
  userId: string;
  facilityId?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX";
  title?: string;
  content?: string;
}) {
  return testDb.rebuttal.create({
    data: {
      title: opts.title ?? "Test Rebuttal",
      content: opts.content ?? "Test content body for the rebuttal.",
      userId: opts.userId,
      facilityId: opts.facilityId ?? null,
      status: opts.status ?? "PENDING",
    },
  });
}

/** Convenience: org + active membership + one user, fully wired. */
export async function createOrgWithUser(opts?: {
  plan?: "NONE" | "TIER_A" | "TIER_B" | "TIER_C";
  status?: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";
  role?: "MEMBER" | "MODERATOR" | "ADMIN";
}) {
  const org = await createOrg();
  const membership = await createMembership({
    organizationId: org.id,
    plan: opts?.plan ?? "TIER_B",
    status: opts?.status ?? "ACTIVE",
  });
  const user = await createUser({ organizationId: org.id, role: opts?.role ?? "MEMBER" });
  return { org, membership, user };
}
