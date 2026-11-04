/**
 * Security headers, applied in next.config.ts. Kept here so tests can import
 * them without loading the Next.js config.
 */
const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

/**
 * Security headers (SOW 11, RELEASE_READINESS S-13).
 *
 * CSP without nonces (node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md, "Without Nonces"), so static pages stay static.
 * 'unsafe-inline' for scripts is needed by Next.js inline bootstrap scripts
 * without nonces; 'unsafe-eval' only in development (React dev tooling).
 *
 * Third parties allowed, and why:
 * - www.googletagmanager.com / *.google-analytics.com: Google Analytics, which
 *   loads only after the visitor consents (AnalyticsConsent.tsx).
 * - *.uploadthing.com: member file uploads go straight from the browser to
 *   UploadThing's ingest servers.
 * Stripe Checkout and the billing portal are full-page redirects, not frames
 * or scripts, so Stripe needs no entry. Fonts are self-hosted by next/font.
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://www.googletagmanager.com https://*.google-analytics.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.uploadthing.com",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

export const securityHeaders = [
  // HSTS only in production (localhost is plain http). No includeSubDomains or
  // preload: those commit every subdomain of the client's domain to HTTPS
  // and should be a deliberate choice by whoever owns the domain.
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];
