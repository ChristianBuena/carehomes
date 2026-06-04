"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useProviderFilters } from "@/hooks/useProviderFilters";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Provider } from "@/lib/mock-data/providers";
import { cn } from "@/lib/utils";

interface ProviderFiltersProps {
  providers: Provider[];
}

export function ProviderFilters({ providers }: ProviderFiltersProps) {
  const { type, county, search, updateFilter, clearFilters, hasActiveFilters } =
    useProviderFilters();

  // Local state for search input to allow debouncing without laggy typing
  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync local search when URL changes externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Push debounced search to URL
  useEffect(() => {
    if (debouncedSearch !== search) {
      updateFilter("search", debouncedSearch);
    }
  }, [debouncedSearch, search, updateFilter]);

  const uniqueCounties = useMemo(() => {
    const counties = new Set(providers.map((p) => p.county));
    return Array.from(counties).sort();
  }, [providers]);

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)] pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by name or specialty..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </div>

        {/* Provider Type Segmented Control */}
        <div className="flex items-center p-1 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] w-full lg:w-auto">
          {(["all", "attorney", "paralegal"] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateFilter("type", t)}
              className={cn(
                "flex-1 lg:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                type === t
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]/50"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>

        {/* County Select */}
        <div className="w-full lg:w-48 shrink-0">
          <Select
            value={county}
            onValueChange={(val) => updateFilter("county", val)}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="All Counties" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--color-surface)] border border-[var(--color-border)]">
              <SelectItem value="all">All Counties</SelectItem>
              {uniqueCounties.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} County
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="w-full lg:w-auto shrink-0 text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
