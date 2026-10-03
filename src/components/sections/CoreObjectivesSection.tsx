import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

interface Objective {
  num: string;
  title: string;
  description: string;
  linkText?: string;
  linkHref?: string;
}

const OBJECTIVES: Objective[] = [
  {
    num: "01",
    title: "Create a trusted resource library",
    description:
      "Organize templates, educational materials, citation-response examples, and documentation practices in one accessible place.",
    linkText: "Open the Resource Library",
    linkHref: "/dashboard/library",
  },
  {
    num: "02",
    title: "Strengthen provider knowledge",
    description:
      "Offer plain-language education that helps operators, administrators, and caregivers understand expectations and make informed decisions.",
  },
  {
    num: "03",
    title: "Encourage better documentation",
    description:
      "Promote accurate, timely, and organized records that support resident care, operational accountability, and effective communication.",
  },
  {
    num: "04",
    title: "Advance fairness and consistency",
    description:
      "Identify recurring challenges, encourage transparent practices, and support constructive dialogue about consistent oversight.",
  },
  {
    num: "05",
    title: "Elevate community experience",
    description:
      "Gather lessons and practical insights from providers, residents, families, advocates, and professionals across the care continuum.",
  },
  {
    num: "06",
    title: "Keep residents at the center",
    description:
      "Support systems and practices that protect resident safety, dignity, choice, continuity, and quality of life.",
  },
];

export function CoreObjectivesSection() {
  return (
    <section
      aria-labelledby="core-objectives-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        {/* Section Heading */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em] mb-3">
            What We Aim to Accomplish
          </p>
          <h2
            id="core-objectives-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight"
          >
            Our core objectives
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--color-muted)]">
            Each objective turns our mission into practical, accountable work for the care–home community.
          </p>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {OBJECTIVES.map((item) => (
            <div
              key={item.num}
              className="flex flex-col justify-between p-7 md:p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 hover:shadow-md transition-all duration-300"
            >
              <div>
                {/* Number Badge */}
                <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-md mb-6">
                  {item.num}
                </span>

                {/* Card Title */}
                <h3 className="text-lg md:text-xl font-bold text-[var(--color-text)] mb-3">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {item.description}
                </p>
              </div>

              {/* Optional Link */}
              {item.linkText && item.linkHref && (
                <div className="mt-6 pt-4 border-t border-[var(--color-border)]/50">
                  <Link
                    href={item.linkHref}
                    className="inline-flex items-center text-sm font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {item.linkText} →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </ResponsiveContainer>
    </section>
  );
}
