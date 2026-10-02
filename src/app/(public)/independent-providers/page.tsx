import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Independent Providers & Responsibilities — CareHomesSupportDocs.org",
  description:
    "Information regarding independent commercial providers, attorney engagements, access plans, and separation from association membership.",
});

export default function IndependentProvidersPage() {
  return (
    <div className="py-12 md:py-20 bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl">
        {/* Main Card Shell */}
        <div className="p-6 sm:p-10 md:p-14 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl space-y-12">
          
          {/* Header */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] block">
              Optional Services
            </span>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]">
              Independent providers
            </h1>

            <p className="text-base md:text-lg text-[var(--color-muted)] leading-relaxed max-w-3xl">
              Association membership stands on its own. Technology and legal services require separate contracts and direct payments to the responsible provider.
            </p>

            {/* Top Directory Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                asChild
                variant="outline"
                className="rounded-full px-5 py-2 border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)] font-medium text-xs sm:text-sm transition-all"
              >
                <Link href="/providers?type=vendor">
                  Commercial vendor directory
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full px-5 py-2 border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)] font-medium text-xs sm:text-sm transition-all"
              >
                <Link href="/providers?type=legal">
                  Independent legal assistance directory
                </Link>
              </Button>
            </div>
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Section 1: Commercial provider access plans */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Commercial provider access plans
            </h2>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              For businesses offering products or services to care homes, proposed Regular and Premium annual plans would provide a business profile and defined account support. These participation fees are separate from association dues, private storage and services purchased by customers.
            </p>

            {/* Card: Commercial provider access - awaiting release */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-primary)] space-y-3">
              <h3 className="font-bold text-[var(--color-text)] text-sm sm:text-base">
                Commercial provider access - awaiting release
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Paid commercial provider enrollment is not open. Registration verification is a separate process. Proposed Regular and Premium plans require a confirmed seller, separate agreement, approved billing, completed benefits and staffed support.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-[var(--color-primary)]">
                <Link href="/about" className="hover:underline">
                  Association structure and member choices
                </Link>
                <span className="text-[var(--color-muted)]">·</span>
                <Link href="/contact" className="hover:underline">
                  Existing account or record assistance
                </Link>
              </div>
            </div>

            {/* Actions below card */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Button
                asChild
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-6 py-2.5 shadow-md shadow-[var(--color-primary)]/20 text-xs sm:text-sm transition-all"
              >
                <Link href="/pricing">
                  Compare proposed Regular and Premium plans
                </Link>
              </Button>

              <Link
                href="/contact"
                className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline"
              >
                Commercial provider &amp; attorney registration
              </Link>
            </div>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 2: Commercial technology provider */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Commercial technology provider
            </h2>

            {/* Card: Optional commercial service - awaiting release */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-primary)] space-y-3">
              <h3 className="font-bold text-[var(--color-text)] text-sm sm:text-base">
                Optional commercial service - awaiting release
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                New vault services are unavailable until an independent commercial provider, direct member contract, separate pricing, payment account and security acceptance are in place. Association membership does not activate storage.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-[var(--color-primary)]">
                <Link href="/about" className="hover:underline">
                  Association structure and member choices
                </Link>
                <span className="text-[var(--color-muted)]">·</span>
                <Link href="/contact" className="hover:underline">
                  Existing account or record assistance
                </Link>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pt-1">
              No member-facing commercial provider has been identified for new services. A cloud-storage supplier alone is not the independent provider required by the service model.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pl-1" role="list">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" aria-hidden="true" />
                <span>The provider must publish its legal identity, price, direct member agreement, support contact, renewal and refund rules before a purchase.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" aria-hidden="true" />
                <span>It owns its merchant account, customer contract, security, storage, notices, export, recovery and record-retention duties.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" aria-hidden="true" />
                <span>Direct login and recovery must work independently of association membership. Canceling one contract must not cancel the other.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" aria-hidden="true" />
                <span>The association receives only necessary integration information and no default right to private files.</span>
              </li>
            </ul>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 3: Independent attorneys and supervised support */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Independent attorneys and supervised support
            </h2>

            {/* Card: Independent legal service - awaiting release */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-primary)] space-y-3">
              <h3 className="font-bold text-[var(--color-text)] text-sm sm:text-base">
                Independent legal service - awaiting release
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                New legal intake, matching and assignments are unavailable until referral-law review and an independent attorney&apos;s engagement, conflicts and supervision process are approved.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-[var(--color-primary)]">
                <Link href="/about" className="hover:underline">
                  Association structure and member choices
                </Link>
                <span className="text-[var(--color-muted)]">·</span>
                <Link href="/contact" className="hover:underline">
                  Existing account or record assistance
                </Link>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pt-1">
              No approved attorney listings or legal referrals are available. A neutral directory label does not replace the required California referral-law review. Membership does not create an attorney-client relationship or promise representation.
            </p>

            <ol className="space-y-3 text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed pl-1" role="list">
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-[var(--color-text)] shrink-0">1.</span>
                <span>The responsible attorney verifies authority for the jurisdiction and matter, performs conflicts review and accepts the engagement.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-[var(--color-text)] shrink-0">2.</span>
                <span>The client and attorney sign scope and payment terms directly. The association does not collect retainers, trust money, settlement proceeds or legal fees.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-[var(--color-text)] shrink-0">3.</span>
                <span>The member authorizes selected records for named recipients, with scope, expiration and view/export permissions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-[var(--color-text)] shrink-0">4.</span>
                <span>The attorney supervises any Philippines-based support team under written instructions and required outsourcing/confidentiality consent. Nonlawyers do not independently advise clients or control strategy.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="font-bold text-[var(--color-text)] shrink-0">5.</span>
                <span>Drafts remain &ldquo;FOR ATTORNEY REVIEW ONLY&rdquo; until the attorney records the approved version and delivery or filing authorization.</span>
              </li>
            </ol>
          </section>

          <hr className="border-[var(--color-border)]" />

          {/* Section 4: Planned ChatGPT AI support */}
          <section className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              Planned ChatGPT AI support
            </h2>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              We plan to support independently engaged attorneys and supervised paralegals with source-linked drafts, evidence organization and deadline coordination. AI processing and automated legal-deadline reminders are not active. Attorneys remain responsible for legal judgment, verified sources and final approval.{" "}
              <Link
                href="/planned-ai-support"
                className="text-[var(--color-primary)] font-semibold hover:underline"
              >
                Explore the planned workflow.
              </Link>
            </p>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              Attorney participation includes no exclusivity, referral commission, paid preferential placement or guaranteed case referral. Any future sponsored section for nonlegal commercial providers would require a separate approved advertising policy and clear labeling. No sponsored placements are currently operating. Fees and professional judgment remain independent.
            </p>

            {/* Bottom Links */}
            <div className="flex flex-wrap items-center gap-3 pt-3 text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
              <Link href="/about" className="hover:underline">
                Association responsibilities
              </Link>
              <span className="text-[var(--color-muted)]">·</span>
              <Link href="/contact" className="hover:underline">
                Ask about service availability
              </Link>
            </div>
          </section>

        </div>
      </ResponsiveContainer>
    </div>
  );
}
