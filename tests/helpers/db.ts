import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { TIER_FACILITY_LIMITS } from "@/lib/permissions";

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
      "MembershipAgreement",
      "ProcessedStripeEvent",
      "LoginAttempt"
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
  return testDb.membership.create({
    data: {
      organizationId: opts.organizationId,
      plan,
      status: opts.status ?? "INACTIVE",
      maxFacilities: opts.maxFacilities ?? TIER_FACILITY_LIMITS[plan],
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

export async function createMemberFile(opts: {
  userId: string;
  filename?: string;
  fileType?: "PDF" | "DOCX" | "JPG" | "PNG" | "OTHER";
  mimeType?: string;
  fileSize?: number;
  deletedAt?: Date | null;
}) {
  const key = unique("filekey");
  return testDb.memberFile.create({
    data: {
      filename: opts.filename ?? "document.pdf",
      fileKey: key,
      fileUrl: `https://utfs.test/f/${key}`,
      fileSize: opts.fileSize ?? 1024,
      fileType: opts.fileType ?? "PDF",
      mimeType: opts.mimeType ?? "application/pdf",
      userId: opts.userId,
      deletedAt: opts.deletedAt ?? null,
    },
  });
}

export async function createShareLink(opts: {
  userId: string;
  shareAll?: boolean;
  fileIds?: string[];
  expiry?: "DAYS_7" | "DAYS_30" | "NEVER";
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}) {
  return testDb.fileShareLink.create({
    data: {
      token: unique("sharetoken"),
      userId: opts.userId,
      shareAll: opts.shareAll ?? false,
      expiry: opts.expiry ?? "NEVER",
      expiresAt: opts.expiresAt ?? null,
      revokedAt: opts.revokedAt ?? null,
      selectedFiles: opts.fileIds ? { create: opts.fileIds.map((fileId) => ({ fileId })) } : undefined,
    },
  });
}

export async function createTemplate(opts?: {
  title?: string;
  description?: string;
  category?: "REBUTTAL" | "CHECKLIST" | "GUIDE";
  fileFormat?: "PDF" | "DOCX";
  fileUrl?: string;
  isActive?: boolean;
  uploadedById?: string;
}) {
  return testDb.template.create({
    data: {
      title: opts?.title ?? unique("Template"),
      description: opts?.description ?? "A template",
      category: opts?.category ?? "REBUTTAL",
      fileFormat: opts?.fileFormat ?? "PDF",
      fileUrl: opts?.fileUrl ?? `https://files.test/${unique("template")}.pdf`,
      isActive: opts?.isActive ?? true,
      uploadedById: opts?.uploadedById,
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
