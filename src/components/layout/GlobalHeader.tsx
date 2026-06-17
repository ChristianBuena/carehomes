import Link from "next/link";
import { Shield } from "lucide-react";
import { NavBar } from "./NavBar";
import { MobileMenu } from "./MobileMenu";
import { HeaderAuthActions } from "./HeaderAuthActions";

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-primary)]/95 backdrop-blur-md text-[var(--color-surface)]">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-surface)] focus:text-[var(--color-primary)] focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Full width, no max-w constraint — just padding */}
      <div className="flex h-20 items-center justify-between gap-8 px-6 md:px-10 lg:px-14 xl:px-20">
        {/* Logo + Badge */}
        <div className="flex items-center gap-5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="CareHomesSupportDocs.org Home"
          >
            <Shield
              className="h-7 w-7 text-[var(--color-blue-100)]"
              aria-hidden="true"
            />
            <span className="text-lg font-bold tracking-tight text-white hidden sm:block whitespace-nowrap">
              CareHomesSupportDocs
              <span className="text-[var(--color-blue-100)]">.org</span>
            </span>
            <span className="text-lg font-bold tracking-tight text-white sm:hidden">
              CHSD
            </span>
          </Link>

          <span className="text-xs font-semibold bg-[var(--color-blue-100)]/20 text-[var(--color-blue-50)] px-3 py-1.5 rounded-full hidden md:inline-flex items-center shadow-sm border border-[var(--color-blue-100)]/10 whitespace-nowrap">
            Nonprofit Platform
          </span>
        </div>

        {/* Desktop nav — flex-1 to take up the middle space */}
        <div className="hidden lg:flex flex-1 justify-center">
          <NavBar />
        </div>

        {/* Desktop Actions */}
        <div className="shrink-0">
          <HeaderAuthActions />
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
