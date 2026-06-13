import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export function DisclaimerBanner() {
  return (
    <section
      aria-label="Important disclaimers"
      className="bg-[var(--color-warning)]/8 border-y-2 border-[var(--color-warning)]/30 py-12"
    >
      <ResponsiveContainer className="max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Icon */}
          <div className="shrink-0 h-11 w-11 rounded-full bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/30 flex items-center justify-center">
            <AlertTriangle
              className="h-5 w-5 text-[var(--color-warning)]"
              aria-hidden="true"
            />
          </div>

          {/* Content */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[var(--color-text)]">
              Important — Please Read Before Using This Site
            </h2>

            <ul className="space-y-2 text-sm text-[var(--color-text)] leading-relaxed list-none break-words">
              <li className="flex items-baseline gap-2">
                <span className="text-[var(--color-warning)] font-bold shrink-0">›</span>
                <span>
                  <strong>Not a government website.</strong> CareHomesSupportDocs.org is an
                  independent nonprofit. We have no affiliation with the CCLD, CDSS, or
                  any California government agency.
                </span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="text-[var(--color-warning)] font-bold shrink-0">›</span>
                <span>
                  <strong>Not legal advice.</strong> Nothing on this site constitutes legal
                  advice or creates an attorney-client relationship. Always consult a
                  licensed attorney for legal matters.
                </span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="text-[var(--color-warning)] font-bold shrink-0">›</span>
                <span>
                  <strong>Always verify at official sources.</strong> Facility data and
                  citation information may not be current. Verify all records directly at{" "}
                  <a
                    href="https://www.ccld.dss.ca.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-[var(--color-primary)] transition-colors inline-flex items-center gap-1"
                    aria-label="Visit official CCLD website (opens in new tab)"
                  >
                    ccld.dss.ca.gov
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                  .
                </span>
              </li>
            </ul>

            <p className="text-xs text-[var(--color-muted)]">
              Read our full{" "}
              <Link href="/disclaimer" className="underline underline-offset-2 hover:text-[var(--color-primary)] transition-colors">
                Legal Disclaimer
              </Link>
              {" "}for complete terms of use.
            </p>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
