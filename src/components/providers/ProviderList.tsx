import { Provider } from "@/lib/mock-data/providers";
import { ProviderCard } from "./ProviderCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { NoResultsEmptyState } from "@/components/ui/NoResultsEmptyState";

interface ProviderListProps {
  providers: Provider[];
  /** Active search query — triggers NoResultsEmptyState when set */
  query?: string;
  onClearFilters?: () => void;
}

export function ProviderList({ providers, query, onClearFilters }: ProviderListProps) {
  // Sort alphabetically by name
  const sortedProviders = [...providers].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (providers.length === 0) {
    if (query) {
      return (
        <NoResultsEmptyState
          query={query}
          onClear={onClearFilters}
        />
      );
    }
    return (
      <EmptyState
        variant="no-providers"
        action={onClearFilters ? { label: "Clear filters", onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm font-medium text-[var(--color-muted)] pb-2 border-b border-[var(--color-border)]">
        Showing {providers.length} provider{providers.length !== 1 ? "s" : ""}
      </div>
      
      <div className="flex flex-col gap-6">
        {sortedProviders.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}
