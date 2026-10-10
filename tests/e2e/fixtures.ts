import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { signToken } from "@/lib/jwt";
import type { Page } from "@playwright/test";

const execFileP = promisify(execFile);
const CLI_PATH = path.resolve(__dirname, "db-cli.ts");
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

async function run<T = unknown>(op: string, args?: Record<string, unknown>): Promise<T> {
  const { stdout } = await execFileP("npx", ["tsx", CLI_PATH, JSON.stringify({ op, args })], {
    cwd: PROJECT_ROOT,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout ? JSON.parse(stdout) : (null as T);
}

type Org = { id: string; name: string };
type User = { id: string; email: string; role: "MEMBER" | "MODERATOR" | "ADMIN"; organizationId: string | null };
type Facility = { id: string; slug: string; name: string; createdById: string | null; organizationId: string | null };

export const resetDb = () => run<void>("reset");
export const createOrg = (args?: { name?: string }) => run<Org>("createOrg", args);
export const createMembership = (args: {
  organizationId: string;
  plan?: "NONE" | "TIER_A" | "TIER_B" | "TIER_C";
  status?: "ACTIVE" | "INACTIVE" | "PAST_DUE" | "CANCELED";
}) => run("createMembership", args);
export const createUser = (args: { organizationId?: string | null; role?: "MEMBER" | "MODERATOR" | "ADMIN"; email?: string }) =>
  run<User>("createUser", args);
export const createFacility = (args?: { organizationId?: string | null; createdById?: string | null; name?: string; deletedAt?: string | null }) =>
  run<Facility>("createFacility", args);

type RebuttalStatus = "PENDING" | "APPROVED" | "REJECTED" | "REQUEST_FIX";
type Rebuttal = { id: string; title: string; status: RebuttalStatus };

export const createRebuttal = (args: { userId: string; facilityId?: string | null; status?: RebuttalStatus; title?: string }) =>
  run<Rebuttal>("createRebuttal", args);
export const softDeleteFacility = (id: string) => run("softDeleteFacility", { id });
export const setRebuttalStatus = (id: string, status: RebuttalStatus) => run("setRebuttalStatus", { id, status });
export const countRebuttals = () => run<number>("countRebuttals");

type MemberFile = { id: string; filename: string; fileUrl: string };
type ShareLink = { id: string; token: string };

export const createMemberFile = (args: { userId: string; filename?: string }) => run<MemberFile>("createMemberFile", args);
export const createShareLink = (args: {
  userId: string;
  shareAll?: boolean;
  fileIds?: string[];
  expiresAt?: string | null;
  revokedAt?: string | null;
}) => run<ShareLink>("createShareLink", args);

/**
 * E2E scope note: driving the real login+OTP form would need either a real
 * email provider (forbidden) or re-deriving the OTP through the UI, which
 * tests/integration/auth.test.ts already covers exhaustively with a mocked
 * mailer. For E2E we seed the DB directly and inject a real, validly-signed
 * auth-token cookie — this still exercises the REAL page, REAL middleware,
 * and REAL Prisma-backed rendering logic; only the login FORM itself is
 * skipped.
 */
export async function loginAs(page: Page, user: User) {
  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId ?? "",
  });
  await page.context().addCookies([
    { name: "auth-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
}
