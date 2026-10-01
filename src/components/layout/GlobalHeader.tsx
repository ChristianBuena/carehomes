import Link from "next/link";
import Image from "next/image";
import { NavBar } from "./NavBar";
import { MobileMenu } from "./MobileMenu";
import { HeaderAuthActions } from "./HeaderAuthActions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LogoShield } from "@/components/ui/LogoShield";

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 dark:border-[var(--color-border)] bg-[var(--color-header-bg)]/95 backdrop-blur-md text-white transition-colors duration-200">
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
            <LogoShield size={36} priority />
            <span className="text-lg font-bold tracking-tight text-white hidden sm:block whitespace-nowrap">
              CareHomesSupportDocs
              <span className="text-[var(--color-blue-100)]">.org</span>
            </span>
            <span className="text-lg font-bold tracking-tight text-white sm:hidden">
              CHSD
            </span>
          </Link>

          <span className="text-xs font-semibold bg-white/10 text-white/80 px-3 py-1.5 rounded-full hidden md:inline-flex items-center shadow-sm border border-white/10 whitespace-nowrap">
            Nonprofit Platform
          </span>
        </div>

        {/* Desktop nav — flex-1 to take up the middle space */}
        <div className="hidden lg:flex flex-1 justify-center">
          <NavBar />
        </div>

        {/* Desktop Actions */}
        <div className="shrink-0 flex items-center gap-3">
          <ThemeToggle />
          <HeaderAuthActions />
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
