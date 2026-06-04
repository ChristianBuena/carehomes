import type { ElementType } from "react";
import Link from "next/link";
import { Search, FileX, Users, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type LucideIconComponent = ElementType<{ className?: string }>;

export type EmptyStateVariant =
  | "no-results"
  | "no-rebuttals"
  | "no-providers"
  | "generic";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  /** Override the default icon for the variant */
  icon?: LucideIconComponent;
  title?: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

// ─── Variant Defaults ─────────────────────────────────────────────────────────

const VARIANT_DEFAULTS: Record<
  EmptyStateVariant,
  { icon: LucideIconComponent; title: string; description: string }
> = {
  "no-results": {
    icon: Search,
    title: "No facilities found matching your search",
    description:
      "Try adjusting your filters or search terms to find what you're looking for.",
  },
  "no-rebuttals": {
    icon: FileX,
    title: "No published rebuttals for this facility yet",
    description:
      "The facility operator has not submitted any rebuttals, or submissions are still under moderation review.",
  },
  "no-providers": {
    icon: Users,
    title: "No providers match your filters",
    description:
      "Try broadening your search or clearing your filters to see more results.",
  },
  generic: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "Check back later or adjust your filters.",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyState({
  variant = "generic",
  icon: IconOverride,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const Icon = IconOverride ?? defaults.icon;
  const resolvedTitle = title ?? defaults.title;
  const resolvedDescription = description ?? defaults.description;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        "rounded-2xl border-2 border-dashed border-[var(--color-border)]",
        "bg-[var(--color-surface)]",
        className
      )}
      role="status"
      aria-label={resolvedTitle}
    >
      {/* Icon container */}
      <div
        className="h-16 w-16 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center mb-5"
        aria-hidden="true"
      >
        <Icon className="h-7 w-7 text-[var(--color-muted)]" />
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-[var(--color-text)] mb-2 max-w-xs">
        {resolvedTitle}
      </h3>
      {resolvedDescription && (
        <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-sm mb-6">
          {resolvedDescription}
        </p>
      )}

      {/* Action */}
      {action &&
        (action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors shadow-sm"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
