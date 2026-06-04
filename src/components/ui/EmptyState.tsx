import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Large icon to display above the heading */
  icon: ReactNode;
  heading: string;
  description?: string;
  /** Optional CTA element (e.g. a Button) */
  action?: ReactNode;
}

export function EmptyState({
  icon,
  heading,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
      <div className="h-16 w-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-5 text-[var(--color-muted)]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
        {heading}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-sm leading-relaxed mb-6">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
