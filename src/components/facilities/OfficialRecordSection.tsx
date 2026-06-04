import { ExternalLink, AlertTriangle, Link2Off } from "lucide-react";

interface OfficialRecordSectionProps {
  ccldLink: string | null;
  facilityName: string;
}

export function OfficialRecordSection({
  ccldLink,
  facilityName,
}: OfficialRecordSectionProps) {
  return (
    <section
      aria-labelledby="official-record-heading"
      className="rounded-2xl border-2 border-[var(--color-secondary)]/40 bg-[var(--color-secondary)]/5 overflow-hidden"
    >
      {/* Header strip */}
      <div className="bg-[var(--color-secondary)]/10 border-b border-[var(--color-secondary)]/20 px-6 py-4">
        <h2
          id="official-record-heading"
          className="text-lg font-bold text-[var(--color-secondary)]"
        >
          Official CCLD Record
        </h2>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Body copy */}
        <p className="text-[var(--color-text)] leading-relaxed">
          This facility&apos;s official record is maintained by the{" "}
          <strong>California Department of Social Services Community Care Licensing
          Division (CCLD)</strong>. Always verify information at the official source.
        </p>

        {ccldLink ? (
          <>
            {/* Primary CTA button */}
            <a
              href={ccldLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${facilityName} official CCLD record (opens in new tab)`}
              className="inline-flex items-center gap-2.5 h-12 px-6 rounded-xl bg-[var(--color-secondary)] text-[var(--color-surface)] font-semibold text-sm hover:bg-[var(--color-secondary)]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] focus-visible:ring-offset-2 transition-colors shadow-sm"
            >
              View Official CCLD Record
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>

            {/* Warning note */}
            <p className="flex items-start gap-2.5 text-sm text-[var(--color-muted)]">
              <AlertTriangle
                className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              This link opens an external government website.
              CareHomesSupportDocs.org is not affiliated with CCLD.
            </p>
          </>
        ) : (
          /* Fallback: no link available */
          <div className="flex items-start gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
            <Link2Off
              className="h-5 w-5 text-[var(--color-muted)] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              Official link not yet available.{" "}
              <a
                href="mailto:support@carehomessupportdocs.org"
                className="font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors underline"
              >
                Contact us
              </a>{" "}
              to report the correct link.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
