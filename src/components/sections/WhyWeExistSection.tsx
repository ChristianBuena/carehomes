import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

const WHY_WE_EXIST_ITEMS = [
  "Make documentation easier to understand and use through practical guides, organized examples, and educational tools.",
  "Help care providers respond constructively to citations and compliance concerns with clear, evidence-informed resources.",
  "Preserve and share institutional knowledge so valuable experience is not lost or isolated within individual care homes.",
  "Promote fair, consistent, and transparent oversight while keeping resident safety and dignity at the center.",
  "Build a collaborative support network where providers can learn from one another and strengthen the quality of residential care.",
];

export function WhyWeExistSection() {
  return (
    <section
      aria-labelledby="why-we-exist-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column — 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em]">
                Why We Exist
              </span>
            </div>

            <h2
              id="why-we-exist-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
            >
              Our purpose is to protect care through knowledge and support.
            </h2>

            <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed">
              We are developing a California nonprofit mutual benefit association intended to seek section 501(c)(6) recognition, focused on common industry education, research and advocacy. Formation and exemption have not been verified on this website.{" "}
              <Link
                href="/about"
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                See our structure and responsibilities
              </Link>
              .
            </p>

            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                className="rounded-full px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)] font-medium transition-all"
              >
                <Link href="/library">Explore the Resource Library</Link>
              </Button>
            </div>
          </div>

          {/* Right Column — 7 cols, 5 checklist cards */}
          <div className="lg:col-span-7 space-y-4">
            {WHY_WE_EXIST_ITEMS.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-5 md:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-accent)]/30 transition-all duration-200"
              >
                {/* Circular Pink/Coral Check Badge */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white shadow-sm">
                  <Check className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                </div>
                {/* Text */}
                <p className="text-sm md:text-base font-medium text-[var(--color-text)] leading-snug">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
