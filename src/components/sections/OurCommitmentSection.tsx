import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

const COMMITMENT_POINTS = [
  "Use plain language and practical formats.",
  "Respect privacy and responsible redaction.",
  "Separate education from individualized legal advice.",
  "Invite diverse perspectives and lived experience.",
  "Measure success by usefulness, fairness, and improved care.",
];

export function OurCommitmentSection() {
  return (
    <section
      aria-labelledby="our-commitment-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column — Glowing Quote Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-raised)] dark:from-[#131d36] dark:to-[#0d1627] border border-[var(--color-border)] dark:border-[#2a3c63] shadow-xl dark:shadow-2xl dark:shadow-blue-950/40 overflow-hidden">
              {/* Subtle ambient light inside card */}
              <div
                className="absolute top-0 left-0 w-32 h-32 bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary)]/15 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute bottom-0 right-0 w-32 h-32 bg-[var(--color-accent)]/10 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />

              <blockquote className="relative z-10 text-2xl md:text-3xl font-bold text-[var(--color-text)] dark:text-white leading-snug tracking-tight">
                When care providers have clear information and dependable support, residents and families benefit too.
              </blockquote>
            </div>
          </div>

          {/* Right Column — Values and Bullets (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em] mb-3">
                Our Commitment
              </p>
              <h2
                id="our-commitment-heading"
                className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
              >
                Responsible, practical, and community–led.
              </h2>
              <p className="mt-4 text-base md:text-lg text-[var(--color-muted)] leading-relaxed">
                Our work will be guided by values that earn trust and create lasting public benefit.
              </p>
            </div>

            {/* Bullet points with pink/coral dots */}
            <ul className="space-y-3.5 pt-2" role="list">
              {COMMITMENT_POINTS.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-2 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-base text-[var(--color-text)] font-medium leading-relaxed">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
