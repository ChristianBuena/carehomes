import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { AuthTokenPayload } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

/**
 * The one place a session token is turned into a user (SOW 11.1a).
 *
 * Verifies the token, then loads the user from the database and returns the
 * payload with the CURRENT role and organization, not the values baked into
 * the token (which can be up to 7 days old).
 *
 * Returns null when the user no longer exists or the session was revoked
 * (the token's `tv` claim does not match User.tokenVersion).
 * Throws when the token itself is invalid (same as verifyToken).
 */
export async function resolveSessionUser(token: string): Promise<AuthTokenPayload | null> {
  const decoded = await verifyToken(token);

  const dbUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { role: true, organizationId: true, tokenVersion: true },
  });

  if (!dbUser) return null;
  if ((decoded.tv ?? 0) !== dbUser.tokenVersion) return null;

  return {
    ...decoded,
    role: dbUser.role,
    orgId: dbUser.organizationId ?? "",
    tv: dbUser.tokenVersion,
  };
}

/**
 * Same as resolveSessionUser, but never throws: an invalid, expired or revoked
 * token gives null. Use in route handlers: `if (!user) return 401`.
 */
export async function getSessionUser(token: string | undefined): Promise<AuthTokenPayload | null> {
  if (!token) return null;
  try {
    return await resolveSessionUser(token);
  } catch {
    return null;
  }
}

/**
 * Invalidates every session the user has (all devices). Returns false if the
 * user does not exist.
 */
export async function revokeUserSessions(userId: string): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  return count === 1;
}

/**
 * Gets the authenticated user from request cookies
 * (Server-side only)
 */
export async function getUserFromRequest(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();
    return await getSessionUser(cookieStore.get("auth-token")?.value);
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
}
