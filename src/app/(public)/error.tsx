"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Home page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <h2 className="text-2xl font-bold text-[var(--color-primary)] mb-4">
        Something went wrong
      </h2>
      <p className="text-[var(--color-text)] mb-8 max-w-md">
        We apologize for the inconvenience. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <Button
          onClick={() => reset()}
          className="bg-[var(--color-secondary)] text-[var(--color-surface)] hover:bg-[var(--color-secondary-hover)]"
        >
          Try again
        </Button>
        <Button
          variant="outline"
          className="border-[var(--color-primary)] text-[var(--color-primary)]"
          onClick={() => window.location.href = "/"}
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}
