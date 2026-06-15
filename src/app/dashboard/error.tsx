"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] py-12 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-[var(--color-danger)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Something went wrong</h2>
        <p className="text-[var(--color-muted)]">
          We encountered an error loading your dashboard. Please try again.
        </p>
        <Button onClick={() => reset()} className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90">
          Try again
        </Button>
      </div>
    </div>
  );
}
