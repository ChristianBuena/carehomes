import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { resetDb, disconnectDb, createUser } from "../helpers/db";
import { buildRequest, authCookie } from "../helpers/http";
import { GET as accessReviewGet, POST as accessReviewPost } from "@/app/api/admin/access-review/route";
import { POST as archiveModerationLogs } from "@/app/api/admin/archive-moderation-logs/route";

beforeEach(resetDb);
afterAll(disconnectDb);

describe("GET /api/admin/access-review — CRITICAL CONFIRMED BUG", () => {
  it("returns 500 for an ADMIN, every time, because the query still selects the pre-CH-18 " +
     "User.membership relation which no longer exists (moved to Organization.membership). " +
     "Confirmed as a genuine Prisma runtime error (PrismaClientValidationError: 'Unknown field " +
     "`membership` for select statement on model `User`'), NOT caught by `npx tsc --noEmit` — " +
     "see TEST_REPORT.md for why the type-checker misses this class of error entirely.", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(admin) })
    );
    expect(res.status).toBe(500);
  });

  it("MODERATOR also hits the same 500 (permission check passes, then the query itself fails)", async () => {
    const moderator = await createUser({ role: "MODERATOR", organizationId: null });
    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(moderator) })
    );
    expect(res.status).toBe(500);
  });

  it("MEMBER is still correctly forbidden before the query ever runs (403, not 500)", async () => {
    const member = await createUser({ role: "MEMBER", organizationId: null });
    const res = await accessReviewGet(
      buildRequest("http://localhost/api/admin/access-review", { cookies: await authCookie(member) })
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/access-review — marking a user reviewed works correctly", () => {
  it("ADMIN can mark a user as reviewed (this handler does not touch the broken membership relation)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const target = await createUser({ role: "MEMBER", organizationId: null });

    const res = await accessReviewPost(
      buildRequest("http://localhost/api/admin/access-review", {
        method: "POST",
        body: { userId: target.id },
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/archive-moderation-logs", () => {
  it("ADMIN can trigger archival with no logs to archive (0, not a crash)", async () => {
    const admin = await createUser({ role: "ADMIN", organizationId: null });
    const res = await archiveModerationLogs(
      buildRequest("http://localhost/api/admin/archive-moderation-logs", {
        method: "POST",
        cookies: await authCookie(admin),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.archivedCount).toBe(0);
  });

  it("MEMBER is forbidden", async () => {
    const member = await createUser({ role: "MEMBER", organizationId: null });
    const res = await archiveModerationLogs(
      buildRequest("http://localhost/api/admin/archive-moderation-logs", {
        method: "POST",
        cookies: await authCookie(member),
      })
    );
    expect(res.status).toBe(403);
  });
});
