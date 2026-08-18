import "./globals.css";
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";

import { siteConfig } from "@/lib/site-config";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://carehomessupportdocs.com"),

  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },

  description: siteConfig.tagline,

  applicationName: siteConfig.name,

  keywords: [
    "California care homes",
    "CCLD",
    "care home compliance",
    "facility rebuttals",
    "assisted living",
    "RCFE",
    "ARF",
    "California licensing",
  ],

  authors: [
    {
      name: "CareHomesSupportDocs",
    },
  ],

  creator: "CareHomesSupportDocs",

  publisher: "CareHomesSupportDocs",

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://carehomessupportdocs.com",
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.tagline,
  },

  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.tagline,
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",

    "@id": "https://carehomessupportdocs.com/#organization",

    name: "CareHomesSupportDocs",

    url: "https://carehomessupportdocs.com",

    logo: "https://carehomessupportdocs.com/logo.png",
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",

    "@id": "https://carehomessupportdocs.com/#website",

    url: "https://carehomessupportdocs.com",

    name: "CareHomesSupportDocs",

    publisher: {
      "@id": "https://carehomessupportdocs.com/#organization",
    },
  };

  return (
    <html lang="en">
      <body>
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />

        {children}

        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}