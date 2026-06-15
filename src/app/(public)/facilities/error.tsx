"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export default function FacilitiesError({
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
    <div className="min-h-screen bg-[var(--color-bg)] py-12">
      <ResponsiveContainer className="flex items-center justify-center min-h-[50vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-[var(--color-danger)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Unable to Load Facilities</h2>
          <p className="text-[var(--color-muted)]">
            We encountered an error while fetching the directory. Please try again.
          </p>
          <Button onClick={() => reset()} className="bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90">
            Try again
          </Button>
        </div>
      </ResponsiveContainer>
    </div>
  );
}
