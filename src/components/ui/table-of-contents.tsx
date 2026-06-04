"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  label: string;
}

interface TableOfContentsProps {
  items: TocItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // We only care when they become intersecting
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
          // In case multiple are intersecting, grab the topmost one
          setActiveId(intersecting[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px" } // trigger in the upper middle area of viewport
    );

    items.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      items.forEach((item) => {
        const element = document.getElementById(item.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [items]);

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4" aria-label="Table of Contents">
      <h3 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-4">
        On this page
      </h3>
      <ul className="space-y-3 border-l-2 border-[var(--color-border)]">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block pl-4 text-sm transition-colors duration-200",
                activeId === item.id
                  ? "text-[var(--color-accent)] font-semibold border-l-2 border-[var(--color-accent)] -ml-[2px]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-primary)]"
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
