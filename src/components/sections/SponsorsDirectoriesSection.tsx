import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export function SponsorsDirectoriesSection() {
  return (
    <section
      aria-labelledby="sponsors-directories-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] border-t border-white/5 transition-colors duration-200"
    >
      <ResponsiveContainer>
        {/* Section Heading */}
        <div className="max-w-3xl mb-12">
          <h2
            id="sponsors-directories-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[var(--color-text)]"
          >
            Sponsors Directories
          </h2>
          <p className="mt-4 text-base md:text-lg text-[var(--color-muted)]">
            Explore the separate directories for commercial vendors and independent legal assistance.
          </p>
        </div>

        {/* 2-Column Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Card 1: Commercial Vendor Directory */}
          <div className="flex flex-col justify-between p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-all duration-300">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text)] mb-3">
                Commercial Vendor Directory
              </h3>
              <p className="text-[var(--color-muted)] text-sm md:text-base leading-relaxed mb-8">
                Products and nonlegal business services for care–home providers.
              </p>
            </div>
            <div>
              <Button
                asChild
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-full px-6 py-2.5 shadow-md shadow-[var(--color-primary)]/20 transition-all"
              >
                <Link href="/providers?type=vendor">
                  View Commercial Vendor Directory
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: Independent Legal Assistance Directory */}
          <div className="flex flex-col justify-between p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:border-[var(--color-primary)]/40 transition-all duration-300">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text)] mb-3">
                Independent Legal Assistance Directory
              </h3>
              <p className="text-[var(--color-muted)] text-sm md:text-base leading-relaxed mb-8">
                Independent attorneys offering assistance within their licensed jurisdictions.
              </p>
            </div>
            <div>
              <Button
                asChild
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-full px-6 py-2.5 shadow-md shadow-[var(--color-primary)]/20 transition-all"
              >
                <Link href="/providers?type=legal">
                  View Independent Legal Assistance Directory
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Disclaimer Note */}
        <p className="mt-8 text-xs leading-relaxed text-[var(--color-muted)] max-w-4xl">
          Listings are reserved for registered, vetted providers with current paid access and approved advertising. Posting is not yet open. Paid participation does not imply an association endorsement.
        </p>
      </ResponsiveContainer>
    </section>
  );
}
