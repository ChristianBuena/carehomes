"use client";

import "./globals.css";
import { Inter, Outfit } from "next/font/google";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";
import { Button } from "@/components/ui/button";

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

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          className={`${outfit.variable} ${inter.variable} min-h-screen flex flex-col font-sans bg-[var(--color-bg)] text-[var(--color-text)]`}
        >
          <GlobalHeader />
          <main className="flex-grow flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-sm text-center space-y-6">
              <div className="h-16 w-16 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-2xl mx-auto flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-[var(--color-primary)]">
                  Something went wrong
                </h1>
                <p className="text-[var(--color-muted)] text-sm leading-relaxed">
                  We encountered an unexpected error while processing your request.
                  Our team has been notified and we are working on a fix.
                </p>
                {/* For development debugging */}
                {process.env.NODE_ENV === "development" && (
                  <div className="mt-4 p-3 bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-xs text-left rounded-md overflow-auto max-h-32 font-mono">
                    {error.message || "Unknown error"}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6 border-t border-[var(--color-border)]">
                <Button
                  onClick={() => reset()}
                  className="w-full sm:w-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto border-[var(--color-border)] hover:bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <Link href="/">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Homepage
                  </Link>
                </Button>
              </div>
            </div>
          </main>
          <GlobalFooter />
        </div>
      </body>
    </html>
  );
}
