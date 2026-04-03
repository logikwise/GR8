/**
 * SearchFilterBar — reusable search / filter / sort / view-toggle controls.
 * Designed to be dropped into any list page (Workflows, Instances, Skills, Tools, Library).
 * TODO (future): connect filter dropdowns to backend facet APIs.
 */

import { Search, X, SlidersHorizontal, ArrowUpDown, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface FilterDef {
  key: string;
  label: string;
  options: string[];
}

export interface SortOption {
  value: string;
  label: string;
}

export interface SearchFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  placeholder?: string;
  filters?: FilterDef[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  sortOptions?: SortOption[];
  activeSort?: string;
  onSortChange?: (v: string) => void;
  viewMode?: "card" | "list";
  onViewModeChange?: (v: "card" | "list") => void;
  resultCount?: number;
  className?: string;
}

export function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = "Search…",
  filters = [],
  activeFilters = {},
  onFilterChange,
  sortOptions = [],
  activeSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  className,
}: SearchFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = Object.values(activeFilters).some((v) => v !== "");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-card pl-8 pr-7 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              filtersOpen || hasActiveFilters
                ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                : "border-border text-muted-foreground hover:border-[var(--grace-accent)]/40 hover:text-foreground"
            )}
          >
            <SlidersHorizontal size={12} />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--grace-accent)] text-[9px] text-white font-bold">
                {Object.values(activeFilters).filter(Boolean).length}
              </span>
            )}
          </button>
        )}

        {/* Sort */}
        {sortOptions.length > 0 && (
          <div className="relative">
            <select
              value={activeSort ?? ""}
              onChange={(e) => onSortChange?.(e.target.value)}
              className="appearance-none rounded-md border border-border bg-card pl-2.5 pr-7 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] cursor-pointer"
            >
              <option value="" disabled>Sort</option>
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ArrowUpDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          </div>
        )}

        {/* View mode toggle */}
        {viewMode !== undefined && onViewModeChange && (
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => onViewModeChange("card")}
              className={cn(
                "flex items-center justify-center w-7 h-7 transition-colors",
                viewMode === "card"
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                  : "bg-card text-muted-foreground/60 hover:text-muted-foreground"
              )}
              title="Card view"
            >
              <LayoutGrid size={12} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "flex items-center justify-center w-7 h-7 border-l border-border transition-colors",
                viewMode === "list"
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                  : "bg-card text-muted-foreground/60 hover:text-muted-foreground"
              )}
              title="List view"
            >
              <List size={12} />
            </button>
          </div>
        )}

        {/* Result count */}
        {resultCount !== undefined && (
          <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
            {resultCount} result{resultCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter row */}
      {filtersOpen && filters.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          {filters.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{f.label}:</span>
              <select
                value={activeFilters[f.key] ?? ""}
                onChange={(e) => onFilterChange?.(f.key, e.target.value)}
                className="rounded border border-border bg-card px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
              >
                <option value="">All</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => filters.forEach((f) => onFilterChange?.(f.key, ""))}
              className="text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
