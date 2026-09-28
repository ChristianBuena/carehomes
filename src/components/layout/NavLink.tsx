"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isMobile?: boolean;
}

export function NavLink({ href, children, className, onClick, isMobile = false }: NavLinkProps) {
  const pathname = usePathname();
  
  // Exact match for home, partial match for other routes to keep them active when deeply nested
  const isActive = href === "/" ? pathname === href : pathname.startsWith(href);

  if (isMobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[44px] items-center py-3 px-4 text-lg font-medium transition-colors rounded-lg",
          isActive
            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
            : "text-[var(--color-text)] hover:bg-[var(--color-bg)] hover:text-[var(--color-primary)]",
          className
        )}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-[44px] items-center px-1 py-2 text-sm font-medium transition-colors",
        isActive ? "text-white" : "text-white/80 hover:text-white",
        className
      )}
    >
      {children}
      
      {/* Animated underline / Active indicator */}
      <span
        className={cn(
          "absolute -bottom-1 left-0 h-0.5 bg-[var(--color-accent)] transition-all duration-300 ease-out",
          isActive ? "w-full" : "w-0 group-hover:w-full"
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
