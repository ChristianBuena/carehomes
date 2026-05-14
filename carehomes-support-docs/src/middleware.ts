import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("auth-token")?.value;

  // 🔍 DEBUG: check token
  console.log("TOKEN:", token);

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await verifyToken(token);

  // 🔍 DEBUG: check decoded user
  console.log("USER:", user);
  console.log("ROLE:", user?.role);

  if (!user || !user.role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const path = req.nextUrl.pathname;

  // 🔑 ADMIN ONLY
  if (path.startsWith("/admin")) {
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 🛡 MODERATOR + ADMIN
  if (path.startsWith("/moderation")) {
    if (!["MODERATOR", "ADMIN"].includes(user.role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 👤 MEMBER + ABOVE
  if (path.startsWith("/member")) {
    if (!["MEMBER", "MODERATOR", "ADMIN"].includes(user.role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/moderation/:path*", "/member/:path*"],
};