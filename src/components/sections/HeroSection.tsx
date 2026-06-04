import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[80vh] flex flex-col items-center justify-between bg-[var(--color-bg)] overflow-hidden">
      {/* Background abstract document grid pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.07] pointer-events-none" 
           style={{
             backgroundImage: `linear-gradient(to right, var(--color-primary) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary) 1px, transparent 1px)`,
             backgroundSize: '40px 40px'
           }}
      />
      {/* Gradient fade out at bottom */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[var(--color-bg)] pointer-events-none" />

      {/* Main Hero Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center py-24 flex-grow flex flex-col justify-center items-center">
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight text-[var(--color-primary)] mb-6">
          Give Your Facility a Voice
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-[var(--color-text)] opacity-80 max-w-3xl mb-10 text-balance">
          Manage, submit, and publish rebuttals to regulatory citations — compliantly and transparently.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-white font-semibold">
            <Link href="/facilities">Explore the Directory</Link>
          </Button>
          <Button asChild size="lg" className="w-full sm:w-auto bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-text)] font-semibold">
            <Link href="/pricing">Join as a Member</Link>
          </Button>
        </div>
      </div>

      {/* Trust Bar below hero */}
      <div className="relative z-10 w-full border-t border-[var(--color-border)] bg-[var(--color-surface)] py-4">
        <div className="mx-auto max-w-7xl px-4">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm font-medium text-[var(--color-muted)]">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"></span>
              Nonprofit
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"></span>
              Not a Government Site
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"></span>
              CCLD Deep Links
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"></span>
              Member-Only Submissions
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
