import Link from "next/link";
import { Shield, ExternalLink, Scale, FileText, BookOpen } from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

const POLICY_LINKS = [
  { label: "Legal Disclaimer", href: "/disclaimer", icon: Scale },
  { label: "Privacy Policy", href: "/privacy", icon: BookOpen },
  { label: "Redaction Policy", href: "/redaction-policy", icon: FileText },
  { label: "Takedown Policy", href: "/takedown-policy", icon: ExternalLink },
];

export function AboutSection() {
  return (
    <section
      aria-labelledby="about-heading"
      className="bg-[var(--color-surface)] py-12 md:py-16 lg:py-24 border-y border-[var(--color-border)]"
    >
      <ResponsiveContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left — Text */}
          <div>
            <p className="text-sm font-semibold text-[var(--color-secondary)] uppercase tracking-widest mb-3">
              About Us
            </p>
            <h2
              id="about-heading"
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[var(--color-primary)] tracking-tight mb-6 t"
            >
              CareHomes
            </h2>

            <div className="space-y-5 text-[var(--color-text)] leading-relaxed text-base">
              <p>
                CareHomesSupportDocs.org is an independent nonprofit platform
                built to give licensed California care facility operators a
                transparent, compliant way to publish rebuttals to regulatory
                citations issued by the Community Care Licensing Division
                (CCLD). We believe facility operators deserve a structured,
                moderated channel to provide context alongside the public
                citation record.
              </p>
              <p>
                Every rebuttal published on our platform passes through a
                rigorous moderation process to ensure no resident-identifying
                information is ever disclosed, language remains professional,
                and content stays factually grounded. We are not affiliated with
                any government agency — we are an independent voice for
                California care facility operators.
              </p>
            </div>

            {/* Mission callout */}
            <blockquote className="mt-8 border-l-4 border-[var(--color-secondary)] pl-5 py-1">
              <p className="text-lg font-semibold text-[var(--color-primary)] italic leading-snug">
                "Giving care facilities a fair, transparent voice in the public
                regulatory record."
              </p>
              <footer className="mt-2 text-sm text-[var(--color-muted)]">
                — Our Mission
              </footer>
            </blockquote>
          </div>

          {/* Right — Badges + Policy Links */}
          <div className="space-y-8">
            {/* Nonprofit badge */}
            <div className="flex items-start gap-4 bg-[var(--color-secondary)]/8 border border-[var(--color-secondary)]/20 rounded-2xl p-6">
              <div className="shrink-0 h-12 w-12 rounded-xl bg-[var(--color-secondary)] flex items-center justify-center shadow-sm">
                <Shield
                  className="h-6 w-6 text-[var(--color-surface)]"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="font-bold text-[var(--color-primary)] text-base mb-1">
                  Independent Nonprofit
                </p>
                <p className="text-sm text-[var(--color-text)] leading-relaxed">
                  We are not a government agency. We receive no referral fees or
                  endorsements from any listed facility or provider. Membership
                  fees fund platform operations only.
                </p>
              </div>
            </div>

            {/* Policy links */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-widest mb-4">
                Our Policies
              </h3>
              <ul className="space-y-3" role="list">
                {POLICY_LINKS.map(({ label, href, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 group rounded-lg px-4 py-3 border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/4 transition-all"
                    >
                      <Icon
                        className="h-4 w-4 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-sm font-medium text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                        {label}
                      </span>
                      <span className="ml-auto text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors text-xs">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
