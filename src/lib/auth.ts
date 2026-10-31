import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { AuthTokenPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

/**
 * Verifies a session token and returns its payload with `orgId` replaced by
 * the user's CURRENT organizationId from the database.
 *
 * The token lives for 7 days, so the `orgId` baked into it goes stale as soon
 * as the user is moved to (or removed from) an organization. Every ownership
 * check must go through this function rather than reading `orgId` off the
 * token. `orgId` is "" when the user has no organization.
 *
 * Throws when the token is invalid (same as verifyToken). Returns null when
 * the token is valid but the user no longer exists.
 */
export async function resolveSessionUser(token: string): Promise<AuthTokenPayload | null> {
  const decoded = await verifyToken(token);

  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { organizationId: true },
  });

  if (!dbUser) return null;

  return { ...decoded, orgId: dbUser.organizationId ?? "" };
}

/**
 * Gets the authenticated user from request cookies
 * (Server-side only)
 */
export async function getUserFromRequest(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    return await resolveSessionUser(token);
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
}
