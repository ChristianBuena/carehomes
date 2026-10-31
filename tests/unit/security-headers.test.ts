/**
 * SOW 11 / RELEASE_READINESS S-13: security headers.
 * The production values are checked by importing the module with
 * NODE_ENV=production; tests/e2e/security-headers.spec.ts checks the real
 * production server.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

async function load(env: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", env);
  return import("@/config/security-headers");
}
afterEach(() => vi.unstubAllEnvs());

describe("security headers", () => {
  it("production: HSTS, frame, sniffing, referrer and permissions headers are set", async () => {
    const { securityHeaders } = await load("production");
    const h = Object.fromEntries(securityHeaders.map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toMatch(/^max-age=\d{8,}/);
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toMatch(/camera=\(\)/);
    expect(h["Permissions-Policy"]).toMatch(/microphone=\(\)/);
    expect(h["Permissions-Policy"]).toMatch(/geolocation=\(\)/);
  });

  it("production CSP: no eval, no framing, no plugins, upgrades insecure requests", async () => {
    const { contentSecurityPolicy } = await load("production");
    const d = Object.fromEntries(contentSecurityPolicy.split("; ").map((x) => [x.split(" ")[0], x]));
    expect(d["default-src"]).toBe("default-src 'self'");
    expect(d["script-src"]).not.toContain("unsafe-eval");
    expect(d["frame-ancestors"]).toBe("frame-ancestors 'none'");
    expect(d["object-src"]).toBe("object-src 'none'");
    expect(d["base-uri"]).toBe("base-uri 'self'");
    expect(d["form-action"]).toBe("form-action 'self'");
    expect(d["upgrade-insecure-requests"]).toBeDefined();
    // Only the third parties the app really uses.
    expect(d["connect-src"]).toContain("https://*.uploadthing.com");
    expect(d["script-src"]).toContain("https://www.googletagmanager.com");
    expect(contentSecurityPolicy).not.toMatch(/\*(?!\.)|http:/); // no bare wildcard, no plain http
  });

  it("development: no HSTS (plain http on localhost); eval allowed for React dev tooling only", async () => {
    const { securityHeaders, contentSecurityPolicy } = await load("development");
    expect(securityHeaders.map((x) => x.key)).not.toContain("Strict-Transport-Security");
    expect(contentSecurityPolicy).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy).not.toContain("upgrade-insecure-requests");
  });
});
