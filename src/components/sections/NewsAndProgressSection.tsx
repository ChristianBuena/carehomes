import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export function NewsAndProgressSection() {
  return (
    <section
      id="updates"
      aria-labelledby="news-progress-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        {/* Section Heading */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em] mb-3">
            News & Progress
          </p>
          <h2
            id="news-progress-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
          >
            Building the foundation, openly.
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--color-muted)] leading-relaxed">
            Follow the organization’s early work as we develop useful resources with care providers and the wider residential-care community.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column — Large Featured Card (7 cols) */}
          <div className="lg:col-span-7">
            <div className="relative p-8 md:p-12 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl overflow-hidden h-full flex flex-col justify-between">
              {/* Coral Accent Top Highlight Bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-accent)]"
                aria-hidden="true"
              />

              <div>
                <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-4 block">
                  September 2026 • Organization Update
                </span>

                <h3 className="text-2xl md:text-3xl font-bold text-[var(--color-text)] mb-5 tracking-tight leading-snug">
                  Care Home Support Docs begins its founding phase
                </h3>

                <p className="text-sm md:text-base text-[var(--color-muted)] leading-relaxed">
                  We are defining the standards, safeguards, and community partnerships needed for a responsible citation-and-rebuttal resource library. Early priorities include privacy-conscious redaction, plain-language guidance, and a structured way to preserve lessons learned.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column — 2 Stacked Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top Right Card: Current Priority */}
            <div className="p-7 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">
                Current Priority
              </span>

              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text)] mb-3 tracking-tight">
                Educational resource service
              </h3>

              <p className="text-xs md:text-sm text-[var(--color-muted)] leading-relaxed">
                New legal intake and assignments remain closed. The{" "}
                <Link
                  href="/dashboard/rebuttals"
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  drafting and review workspace
                </Link>{" "}
                is being prepared for independently engaged attorneys and supervised staff. Planned ChatGPT AI assistance would help organize records and draft replies; AI processing and automated legal-deadline reminders are not active.{" "}
                <Link
                  href="/planned-ai-support"
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  Explore the AI service plan.
                </Link>{" "}
                <Link
                  href="/how-it-works"
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  See the phased launch plan.
                </Link>
              </p>
            </div>

            {/* Bottom Right Card: Community Invitation */}
            <div className="p-7 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-3 block">
                Community Invitation
              </span>

              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text)] mb-3 tracking-tight">
                Founding volunteers wanted
              </h3>

              <p className="text-xs md:text-sm text-[var(--color-muted)] leading-relaxed">
                Seeking care-sector experience, research skills, document review, outreach support, and accessible-content expertise.
              </p>

              <div className="mt-4 pt-2">
                <Link
                  href="#get-involved"
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                >
                  Learn how to volunteer →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
