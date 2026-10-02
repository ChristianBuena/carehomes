import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";
import { LogoShield } from "@/components/ui/LogoShield";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "The Meaning Behind Our Logo — CareHomesSupportDocs.org",
  description:
    "A symbol of care, trust and support. Discover the core values behind the Care Home Support Docs shield logo.",
});

interface LogoElement {
  label: string;
  description: string;
}

const LOGO_ELEMENTS: LogoElement[] = [
  {
    label: "Shield",
    description:
      "Protection, advocacy, and support for care homes and the people they serve.",
  },
  {
    label: "Document",
    description:
      "Organized records, educational resources, and evidence supporting informed responses to citations.",
  },
  {
    label: "Padlock",
    description:
      "A commitment to confidentiality, responsible information handling, and controlled access.",
  },
  {
    label: "Home with older adults",
    description:
      "Safe, welcoming homes where residents' dignity and well-being come first.",
  },
  {
    label: "Hands holding a heart",
    description:
      "Compassion, practical assistance, and a community that cares for others.",
  },
  {
    label: "Central clock",
    description:
      "Timely action, attention to deadlines, and support when it matters most.",
  },
  {
    label: "Four connected sections",
    description:
      "The shared importance of documentation, privacy, housing, and compassionate care.",
  },
  {
    label: "Red, white, and blue",
    description:
      "Red represents compassion and courage; white represents clarity and integrity; blue represents trust and dependability.",
  },
];

export default function LogoMeaningPage() {
  return (
    <div className="py-12 md:py-20 lg:py-24 bg-[var(--color-bg)] text-[var(--color-text)] min-h-[90vh] transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl">
        {/* Header Section */}
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-px w-8 bg-[var(--color-accent)] shrink-0"
              aria-hidden="true"
            />
            <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em]">
              The Meaning Behind Our Logo
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text)] leading-[1.15] mb-5">
            A symbol of care, trust and support.
          </h1>

          <p className="text-base sm:text-lg text-[var(--color-muted)] leading-relaxed">
            Our shield brings together the values at the heart of Care Home Support Docs: protecting people, sharing knowledge, and supporting compassionate care.
          </p>
        </div>

        {/* 2-Column Content: Shield on Left, Explanations on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Shield Logo & Caption (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center p-4">
              {/* Subtle ambient glow behind shield */}
              <div
                className="absolute w-64 h-64 rounded-full bg-[var(--color-primary)]/15 dark:bg-[var(--color-primary)]/20 blur-3xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute w-44 h-44 rounded-full bg-[var(--color-accent)]/10 blur-2xl pointer-events-none"
                aria-hidden="true"
              />

              <LogoShield
                width={280}
                height={280}
                className="relative drop-shadow-2xl"
                priority
                alt="Care Home Support Docs official shield logo"
              />
            </div>

            <p className="mt-4 text-xs font-medium text-[var(--color-muted)]">
              Official logo · Care Home Support Docs
            </p>
          </div>

          {/* Right Column: Key Breakdown Items (7 cols) */}
          <div className="lg:col-span-7">
            <ul className="space-y-4" role="list">
              {LOGO_ELEMENTS.map((elem) => (
                <li key={elem.label} className="flex items-start gap-3.5">
                  {/* Subtle bullet indicator matching theme */}
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-sm md:text-base leading-relaxed text-[var(--color-text)]">
                    <strong className="font-bold text-[var(--color-text)]">
                      {elem.label}:
                    </strong>{" "}
                    <span className="text-[var(--color-muted)]">
                      {elem.description}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom CTA */}
        <div className="mt-14 pt-8 border-t border-[var(--color-border)]">
          <Button
            asChild
            size="lg"
            className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-8 shadow-md shadow-[var(--color-primary)]/20 transition-all text-sm"
          >
            <Link href="/">
              Return to homepage
            </Link>
          </Button>
        </div>

      </ResponsiveContainer>
    </div>
  );
}
