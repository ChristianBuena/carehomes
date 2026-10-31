import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { contentSecurityPolicy, securityHeaders } from "./src/config/security-headers";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
    ],
  },
  turbopack: {
    root: __dirname,
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Pages get the site CSP. API routes are excluded: file downloads set
      // their own, stricter CSP (src/services/file-storage.service.ts).
      {
        source: "/((?!api/).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy }],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
