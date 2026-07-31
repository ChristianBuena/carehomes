/**
 * Represents a basic navigation link.
 */
export interface NavLink {
  /** The text label for the link */
  label: string;
  /** The URL path for the link */
  href: string;
  /** Whether the link points to an external site */
  external?: boolean;
}

/**
 * Represents a group of links, typically used in a footer.
 */
export interface FooterLinkGroup {
  /** The heading title for the link group */
  title: string;
  /** The list of links under this group */
  links: NavLink[];
}

/**
 * Represents a social media profile link.
 */
export interface SocialLink {
  /** The name of the social platform */
  platform: string;
  /** The URL to the social profile */
  href: string;
}

/**
 * Site configuration encompassing details, navigation, and contact info.
 */
export interface SiteConfig {
  /** The name of the site */
  name: string;
  /** A short tagline or description */
  tagline: string;
  /** The primary domain URL */
  domain: string;
  /** The main navigation links */
  mainNav: NavLink[];
  /** Grouped links for the footer */
  footerNav: FooterLinkGroup[];
  /** Links to social media profiles */
  socialLinks: SocialLink[];
  /** General contact email */
  contactEmail: string;
  /** Public Notion Knowledge Base URL */
  notionKbUrl: string;
}

/**
 * Global site configuration settings for CareHomesSupportDocs.org.
 */
export const siteConfig: SiteConfig = {
  name: "CareHomesSupportDocs",
  tagline: "Helping licensed California care facility operators manage and publish rebuttals to regulatory citations.",
  domain: "https://carehomessupportdocs.org",
  mainNav: [
    { label: "Home", href: "/" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Facilities", href: "/facilities" },
    { label: "Providers", href: "/providers" },
    { label: "Pricing", href: "/pricing" },
  ],
  footerNav: [
    {
      title: "Directory",
      links: [
        { label: "Facility Directory", href: "/facilities" },
        { label: "Provider Directory", href: "/providers" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "How It Works", href: "/how-it-works" },
        { label: "Pricing", href: "/pricing" },
        {
          label: "Knowledge Base",
          href: process.env.NEXT_PUBLIC_NOTION_KB_URL || "https://notion.so",
          external: true,
        },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Notice", href: "/privacy" },
        { label: "Terms of Use", href: "/terms" },
        { label: "Disclaimer", href: "/disclaimer" },
        { label: "Takedown Policy", href: "/takedown-policy" },
        { label: "Redaction Policy", href: "/redaction-policy" },
      ],
    },
  ],
  socialLinks: [
    { platform: "Twitter", href: "https://twitter.com/carehomesdocs" },
    { platform: "LinkedIn", href: "https://linkedin.com/company/carehomessupportdocs" },
  ],
  contactEmail: "support@carehomessupportdocs.org",
  notionKbUrl: process.env.NEXT_PUBLIC_NOTION_KB_URL || "https://notion.so",
};
