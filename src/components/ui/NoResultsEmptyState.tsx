import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoResultsEmptyStateProps {
  query?: string;
  onClear?: () => void;
  className?: string;
}

export function NoResultsEmptyState({
  query,
  onClear,
  className,
}: NoResultsEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        "rounded-2xl border-2 border-dashed border-[var(--color-border)]",
        "bg-[var(--color-surface)]",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={query ? `No results for ${query}` : "No results found"}
    >
      {/* Icon */}
      <div
        className="h-16 w-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-5"
        aria-hidden="true"
      >
        <Search className="h-7 w-7 text-[var(--color-muted)]" />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
        {query ? (
          <>
            No results for{" "}
            <span className="text-[var(--color-primary)]">
              &ldquo;{query}&rdquo;
            </span>
          </>
        ) : (
          "No results found"
        )}
      </h3>

      {/* Hint */}
      <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-sm mb-6">
        Try different keywords or clear your filters to broaden your search.
      </p>

      {/* Clear button */}
      {onClear && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
