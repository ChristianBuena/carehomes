import Link from "next/link";
import { Shield } from "lucide-react";
import { NavBar } from "./NavBar";
import { MobileMenu } from "./MobileMenu";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-primary)]/95 backdrop-blur-md supports-scrollbars:bg-[var(--color-primary)]/80 text-[var(--color-surface)]">
      {/* Skip to content */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--color-surface)] focus:text-[var(--color-primary)] focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>



      <ResponsiveContainer className="flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2" aria-label="CareHomesSupportDocs.org Home">
            <Shield className="h-6 w-6 text-[var(--color-blue-100)]" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight text-white hidden sm:block">
              CareHomesSupportDocs<span className="text-[var(--color-blue-100)]">.org</span>
            </span>
            <span className="text-lg font-bold tracking-tight text-white sm:hidden">
              CHSD
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <NavBar />

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
            Member Login
          </Button>
          <Button className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] font-semibold border-none">
            Join Now
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden flex items-center">
          <MobileMenu />
        </div>
      </ResponsiveContainer>
    </header>
  );
}
