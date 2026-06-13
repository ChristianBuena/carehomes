import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Canonical base URL for JSON-LD (e.g. "https://carehomessupportdocs.org") */
  baseUrl?: string;
}

export function Breadcrumb({
  items,
  baseUrl = "https://carehomessupportdocs.org",
}: BreadcrumbProps) {
  // Build JSON-LD BreadcrumbList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
      })),
    ],
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Visual breadcrumb */}
      <nav aria-label="Breadcrumb" className="w-full">
        <ol
          className="flex flex-wrap items-center gap-1 text-sm text-[var(--color-muted)]"
          role="list"
        >
          {/* Home always first */}
          <li className="flex items-center gap-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
              aria-label="Home"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </li>

          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={index} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-[var(--color-border)]" aria-hidden="true" />
                {isLast || !item.href ? (
                  <span
                    className={`${
                      isLast
                        ? "text-[var(--color-text)] font-medium"
                        : "text-[var(--color-muted)]"
                    } truncate max-w-[200px] sm:max-w-xs`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-[var(--color-primary)] transition-colors truncate max-w-[200px] sm:max-w-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
