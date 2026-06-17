"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ModerationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Moderation page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" aria-hidden="true" />
        </div>
        
        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-3">
          Unable to Load Moderation Queue
        </h2>
        
        <p className="text-[var(--color-muted)] mb-8">
          We encountered a problem while trying to fetch the pending rebuttals. 
          {error.message && (
            <span className="block mt-2 text-sm text-[var(--color-danger)] font-mono bg-[var(--color-danger)]/5 p-2 rounded">
              {error.message}
            </span>
          )}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={reset}
            className="flex items-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
          >
            <RefreshCcw className="h-4 w-4" /> Try Again
          </Button>
          
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
