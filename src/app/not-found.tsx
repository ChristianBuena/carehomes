import Link from "next/link";
import { Inter, Outfit } from "next/font/google";
import { Search, Home, Building2, CreditCard, Mail } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";
import { FacilitySearch } from "@/components/facilities/FacilitySearch";
import { Suspense } from "react";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function NotFound() {
  return (
    <div
      className={`${outfit.variable} ${inter.variable} min-h-screen flex flex-col font-sans bg-[var(--color-bg)] text-[var(--color-text)]`}
    >
      <GlobalHeader />
      <main className="flex-grow flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full text-center space-y-12">
          {/* Decorative 404 */}
          <div className="relative inline-block">
            <h1 className="text-[8rem] sm:text-[12rem] font-black text-[var(--color-primary)]/5 leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 sm:h-28 sm:w-28 bg-[var(--color-bg)] border-4 border-[var(--color-primary)] rounded-2xl rotate-12 flex items-center justify-center shadow-lg">
                <Search className="h-10 w-10 sm:h-14 sm:w-14 text-[var(--color-secondary)] -rotate-12" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primary)] tracking-tight">
              Page Not Found
            </h2>
            <p className="text-lg text-[var(--color-muted)] max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-left max-w-xl mx-auto">
            <div>
              <label
                htmlFor="facility-search"
                className="block text-sm font-semibold text-[var(--color-text)] mb-3"
              >
                Looking for a facility? Try searching:
              </label>
              <Suspense fallback={<div className="h-12 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl w-full animate-pulse" />}>
                <FacilitySearch />
              </Suspense>
            </div>

            <div className="pt-6 border-t border-[var(--color-border)]">
              <h3 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wider mb-4">
                Helpful Links
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/"
                  className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                >
                  <Home className="h-4 w-4 text-[var(--color-muted)]" />
                  Go to Homepage
                </Link>
                <Link
                  href="/facilities"
                  className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                >
                  <Building2 className="h-4 w-4 text-[var(--color-muted)]" />
                  Browse Facility Directory
                </Link>
                <Link
                  href="/pricing"
                  className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                >
                  <CreditCard className="h-4 w-4 text-[var(--color-muted)]" />
                  View Pricing
                </Link>
                <Link
                  href="mailto:support@carehomessupportdocs.org"
                  className="flex items-center gap-2.5 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg)]"
                >
                  <Mail className="h-4 w-4 text-[var(--color-muted)]" />
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
