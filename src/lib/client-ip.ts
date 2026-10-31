/**
 * Best-effort client IP for rate limiting.
 *
 * The app is deployed behind a trusted proxy/platform that sets
 * X-Forwarded-For. The left-most entry is the client — but ONLY if that proxy
 * overwrites (or strips) any X-Forwarded-For the client sent itself. A proxy
 * that merely appends lets a client forge the left-most entry and dodge
 * per-IP limits.
 *
 * Requests with no usable header all share the "unknown" bucket.
 */
export const UNKNOWN_CLIENT_IP = "unknown";

export function getClientIp(req: { headers: Headers }): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT_IP;
  // An IPv6 address is at most 45 characters; anything longer is not an IP.
  return ip.slice(0, 45);
}
