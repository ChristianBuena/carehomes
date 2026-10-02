import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export function PlannedAiSupportSection() {
  return (
    <section
      aria-labelledby="planned-ai-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] border-t border-[var(--color-border)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        <div className="max-w-4xl space-y-6">
          {/* Overline */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em]">
              Planned ChatGPT AI Assistance
            </span>
          </div>

          {/* Heading */}
          <h2
            id="planned-ai-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
          >
            Support for preparing a timely reply.
          </h2>

          {/* Description */}
          <p className="text-base md:text-lg text-[var(--color-muted)] leading-relaxed">
            We are planning tools to help your attorney and supervised paralegals understand notices, organize evidence and prepare reviewed documents before a verified deadline.
          </p>

          {/* Disclaimer Bold Text */}
          <p className="text-xs md:text-sm text-[var(--color-muted)] leading-relaxed pt-1">
            <strong className="text-[var(--color-text)] font-bold">Not active yet.</strong> AI processing, automated legal-deadline reminders and new legal intake are not available. Membership does not include representation. If a deadline is approaching, contact your attorney promptly.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button
              asChild
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-7 py-2.5 shadow-md shadow-[var(--color-primary)]/20 transition-all text-sm"
            >
              <Link href="/planned-ai-support">
                Explore planned AI support
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="rounded-full px-7 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] font-medium transition-all text-sm"
            >
              <Link href="/pricing">
                Existing member services
              </Link>
            </Button>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
