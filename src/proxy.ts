import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

/**
 * Next.js 16 Proxy (formerly middleware.ts). Runs on the Node.js runtime, so
 * it can check the session against the database: revoked sessions and role
 * changes take effect on the next request (SOW 11.1a).
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;
  const path = req.nextUrl.pathname;

  // ── 1. All protected routes require a valid token ──────────────────────
  if (!token) {
    // API routes → 401; page routes → redirect to login
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await getSessionUser(token);

  if (!user?.role) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── 2. /dashboard/* — any authenticated user ───────────────────────────
  // No extra permission needed beyond having a valid token + role.

  // ── 3. /moderation/* — requires moderate_rebuttals permission ─────────
  if (path.startsWith("/moderation")) {
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // ── 4. /api/admin/* — requires manage_users permission ────────────────
  // Exception: the quarterly access review (and its export) is run by
  // MODERATORs too, so that path needs moderate_rebuttals. The route
  // handlers repeat their own checks.
  if (isAccessReviewApi(path)) {
    if (!hasPermission(user.role, "moderate_rebuttals")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
  } else if (path.startsWith("/api/admin")) {
    if (!hasPermission(user.role, "manage_users")) {
      return NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
  }

  // ── 5. Legacy /admin page route ───────────────────────────────────────
  if (path.startsWith("/admin")) {
    if (!hasPermission(user.role, "manage_users")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

function isAccessReviewApi(path: string): boolean {
  return path === "/api/admin/access-review" || path.startsWith("/api/admin/access-review/");
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/moderation/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/member/:path*",
  ],
};