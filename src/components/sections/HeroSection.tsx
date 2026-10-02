import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { LogoShield } from "@/components/ui/LogoShield";

export default function HeroSection() {
  return (
    <section
      className="relative w-full min-h-[90vh] flex items-center bg-[var(--color-bg)] overflow-hidden"
      aria-label="Hero"
    >
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(circle, var(--color-primary) 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[var(--color-bg)] to-transparent z-0 pointer-events-none"
        aria-hidden="true"
      />

      <ResponsiveContainer className="relative z-10 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          {/* ── Left: Text content ─────────────────────── */}
          <div>
            {/* Section label */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="h-px w-8 bg-[var(--color-accent)] shrink-0"
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.18em]">
                Adult and Senior Residential Care
              </span>
            </div>

            {/* Quick-links sub-row */}
            <div className="flex items-center gap-2 mb-8 text-sm">
              <Link
                href="/pricing"
                className="text-[var(--color-primary)] hover:underline underline-offset-2 transition-colors"
              >
                Member Access
              </Link>
              <span className="text-[var(--color-muted)]" aria-hidden="true">·</span>
              <Link
                href="/dashboard/library"
                className="text-[var(--color-primary)] hover:underline underline-offset-2 transition-colors"
              >
                Resource Library
              </Link>
            </div>

            {/* Main heading — split two-line style */}
            <h1 className="text-5xl sm:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight leading-[1.05] mb-8">
              <span className="text-[var(--color-text)]">
                Better<br />documentation.
              </span>
              <br />
              <span className="text-[var(--color-accent)]">Stronger care.</span>
            </h1>

            <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mb-10 leading-relaxed">
              CareHomesSupportDocs brings California Adult Residential Facility (ARF)
              and Residential Care Facility for the Elderly (RCFE) operators together
              for education, shared resources, and appropriate advocacy. Choose the
              resources that match your facility&apos;s license.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-8 shadow-lg shadow-[var(--color-primary)]/20 transition-all"
              >
                <Link href="/facilities">Explore the Directory</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-primary)]/40 font-semibold rounded-full px-8 transition-all"
              >
                <Link href="/pricing">Join as a Member</Link>
              </Button>
            </div>
          </div>

          {/* ── Right: Brand shield logo ────────────────── */}
          <div className="flex justify-center lg:justify-end">
            <Link
              href="/about/logo"
              className="group relative flex items-center justify-center cursor-pointer"
              aria-label="Learn the meaning behind our logo"
            >
              {/* Ambient glow behind shield */}
              <div className="absolute w-72 h-72 rounded-full bg-[var(--color-primary)]/10 blur-3xl group-hover:bg-[var(--color-primary)]/20 transition-all duration-300" />
              <div className="absolute w-48 h-48 rounded-full bg-[var(--color-accent)]/5 blur-2xl" />
              {/* The actual brand logo */}
              <LogoShield
                width={280}
                height={280}
                className="relative drop-shadow-2xl group-hover:scale-105 transition-transform duration-300"
                priority
                alt="Care Home Support Docs shield logo — document, security, family, and care icons"
              />
            </Link>
          </div>

        </div>
      </ResponsiveContainer>
    </section>
  );
}
