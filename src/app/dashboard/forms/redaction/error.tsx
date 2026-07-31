"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
      <h2 className="text-xl font-bold text-[var(--color-danger)]">Something went wrong</h2>
      <p className="text-sm text-[var(--color-muted)]">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
