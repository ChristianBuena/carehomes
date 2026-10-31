"use client";

export default function ReportsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <h2 className="text-xl font-bold text-[var(--color-text)]">Unable to load reports</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-11 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
