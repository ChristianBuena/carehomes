import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://carehomessupportdocs.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/pricing",
          "/directory",
          "/facilities",
          "/privacy-policy",
          "/terms",
          "/takedown-policy",
        ],
        disallow: [
          "/dashboard",
          "/api",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}