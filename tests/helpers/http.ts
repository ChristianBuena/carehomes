import { NextRequest } from "next/server";
import { signToken } from "@/lib/jwt";
import { setRequestCookies, setRequestHeaders } from "./nextRequestContext";

/**
 * Builds a NextRequest AND mirrors its cookies/headers into the next/headers
 * mock context (see nextRequestContext.ts + tests/setup.ts), since some
 * routes/actions read via NextRequest.cookies directly while others read via
 * the request-scoped cookies()/headers() from "next/headers".
 */
export function buildRequest(
  url: string,
  opts?: {
    method?: string;
    body?: unknown;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  }
): NextRequest {
  const cookieHeader = opts?.cookies
    ? Object.entries(opts.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")
    : undefined;

  const headers: Record<string, string> = { ...(opts?.headers ?? {}) };
  if (cookieHeader) headers.cookie = cookieHeader;
  if (opts?.body !== undefined) headers["content-type"] = "application/json";

  setRequestCookies(opts?.cookies ?? {});
  setRequestHeaders(headers);

  return new NextRequest(url, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/** Signs a real auth-token JWT for a user and returns the cookie map for buildRequest(). */
export async function authCookie(user: {
  id: string;
  email: string;
  role: "MEMBER" | "MODERATOR" | "ADMIN";
  organizationId: string | null;
}): Promise<Record<string, string>> {
  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId ?? "",
  });
  return { "auth-token": token };
}
