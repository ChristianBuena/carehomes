import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import type { AuthTokenPayload } from "@/lib/jwt";

/**
 * Gets the authenticated user from request cookies
 * (Server-side only)
 */
export async function getUserFromRequest(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    // FIX: await the async verifyToken
    const decoded = await verifyToken(token);

    return decoded as AuthTokenPayload;
  } catch (err) {
    console.error("Auth error:", err);
    return null;
  }
}
