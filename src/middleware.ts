import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";

export async function middleware(req: NextRequest) {
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

  let user;
  try {
    user = await verifyToken(token);
  } catch {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

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
  if (path.startsWith("/api/admin")) {
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

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/moderation/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/member/:path*",
  ],
};