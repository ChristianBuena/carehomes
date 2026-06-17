import { NextResponse } from "next/server";
import { getUserFromRequest } from "./auth";
import { hasPermission, type Permission } from "./permissions";

/**
 * Require that the authenticated user has a specific permission.
 * Replaces the old role-string-comparison pattern.
 */
export async function requirePermission(permission: Permission) {
  const user = await getUserFromRequest();

  // ❌ Not logged in
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  // ❌ Missing permission
  if (!hasPermission(user.role, permission)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      ),
      user: null,
    };
  }

  // ✅ Authorized
  return { error: null, user };
}

/**
 * Require that the authenticated user holds one of the listed roles.
 * Use requirePermission() for new code — this is kept for legacy callers.
 */
export async function requireRole(allowedRoles: string[]) {
  const user = await getUserFromRequest();

  // ❌ Not logged in
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  // ❌ Wrong role
  if (!allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      ),
      user: null,
    };
  }

  // ✅ Authorized
  return { error: null, user };
}