import { Metadata } from 'next';

const siteConfig = {
  name: "CareHomesSupportDocs.org",
  description: "A nonprofit membership platform helping licensed California care facility operators manage, submit, and publish rebuttals to regulatory citations.",
  url: "https://carehomessupportdocs.org",
  ogImage: "/og-default.png",
};

export function buildMetadata(overrides: Partial<Metadata> = {}): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
    description: siteConfig.description,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      url: siteConfig.url,
      title: siteConfig.name,
      description: siteConfig.description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.name,
      description: siteConfig.description,
      images: [siteConfig.ogImage],
    },
    robots: { index: true, follow: true },
    ...overrides,
  };
}
