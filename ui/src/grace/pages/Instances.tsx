/**
 * Instances — Phase 5
 *
 * Added: delete instance with ConfirmDialog.
 * TODO (Phase 6): Replace instanceService with GET/DELETE /api/instances.
 */

import { useState, useEffect, useMemo } from "react";
import { Box, ArrowRight, Clock, CircleDot, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { instanceService } from "../instances/instanceService";
import { InstanceCard } from "../components/InstanceCard";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SearchFilterBar, type FilterDef, type SortOption } from "../components/SearchFilterBar";
import type { Instance, InstanceStatus } from "../instances/instanceTypes";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<InstanceStatus, string> = {
  draft:     "text-muted-foreground bg-muted/60 border-border",
  ready:     "text-sky-600 bg-sky-500/10 border-sky-500/30",
  running:   "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  paused:    "text-amber-600 bg-amber-500/10 border-amber-500/30",
  completed: "text-blue-600 bg-blue-500/10 border-blue-500/30",
  failed:    "text-destructive bg-destructive/10 border-destructive/30",
  cancelled: "text-muted-foreground bg-muted/40 border-border",
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function InstanceRow({
  instance, onOpen, onDelete,
}: {
  instance: Instance;
  onOpen: (i: Instance) => void;
  onDelete: (i: Instance) => void;
}) {
  const statusColor = STATUS_COLORS[instance.status] ?? STATUS_COLORS.draft;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 transition-colors hover:border-[var(--grace-accent)]/40 hover:bg-card/80 group">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10">
        <Box size={12} className="text-indigo-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-medium uppercase tracking-wide rounded border px-1.5 py-0.5 shrink-0", statusColor)}>
            {instance.status}
          </span>
          <span className="text-sm font-semibold truncate">{instance.name}</span>
        </div>
        <div className="text-xs text-muted-foreground truncate">from {instance.blueprintName}</div>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><CircleDot size={11} />{instance.graphSnapshot.length} steps</span>
        <span className="flex items-center gap-1"><Clock size={11} />{formatDate(instance.createdAt)}</span>
      </div>
      <button type="button" onClick={() => onDelete(instance)}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
        title="Delete instance">
        <Trash2 size={13} />
      </button>
      <button type="button" onClick={() => onOpen(instance)}
        className="flex items-center gap-1 rounded border border-[var(--grace-accent)] px-2.5 py-1 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)] shrink-0">
        Open <ArrowRight size={11} />
      </button>
    </div>
  );
}

const SORT_OPTIONS: SortOption[] = [
  { value: "created-desc", label: "Newest First" },
  { value: "created-asc",  label: "Oldest First" },
  { value: "updated-desc", label: "Recently Updated" },
  { value: "name-asc",     label: "Name A–Z" },
  { value: "status",       label: "By Status" },
];

function sortInstances(list: Instance[], sort: string): Instance[] {
  return [...list].sort((a, b) => {
    if (sort === "created-desc") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "created-asc")  return a.createdAt.localeCompare(b.createdAt);
    if (sort === "updated-desc") return b.updatedAt.localeCompare(a.updatedAt);
    if (sort === "name-asc")     return a.name.localeCompare(b.name);
    if (sort === "status")       return a.status.localeCompare(b.status);
    return 0;
  });
}

function buildFilterDefs(instances: Instance[]): FilterDef[] {
  const statuses   = [...new Set(instances.map((i) => i.status))];
  const blueprints = [...new Set(instances.map((i) => i.blueprintName))];
  const defs: FilterDef[] = [];
  if (statuses.length > 1)   defs.push({ key: "status",    label: "Status",    options: statuses });
  if (blueprints.length > 1) defs.push({ key: "blueprint", label: "Blueprint", options: blueprints });
  return defs;
}

export function GraceInstances() {
  const navigate = useNavigate();
  const [allInstances, setAllInstances] = useState<Instance[]>([]);

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState("created-desc");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Instance | null>(null);

  function reload() {
    setAllInstances(instanceService.getAll());
  }

  useEffect(() => { reload(); }, []);

  const filterDefs = useMemo(() => buildFilterDefs(allInstances), [allInstances]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = allInstances.filter((inst) => {
      if (q && !inst.name.toLowerCase().includes(q) &&
          !inst.blueprintName.toLowerCase().includes(q)) return false;
      if (activeFilters.status    && inst.status        !== activeFilters.status)    return false;
      if (activeFilters.blueprint && inst.blueprintName !== activeFilters.blueprint) return false;
      return true;
    });
    return sortInstances(list, activeSort);
  }, [allInstances, search, activeFilters, activeSort]);

  function handleOpen(instance: Instance) {
    navigate(`/grace/studio/instance/${instance.id}`);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    instanceService.remove(deleteTarget.id);
    setDeleteTarget(null);
    reload();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instances are executable snapshots derived from Blueprints. Only Instances can be run.
          </p>
        </div>
        <button type="button" onClick={() => navigate("/grace/library")}
          className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
          Create from Blueprint
        </button>
      </div>

      {allInstances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Box size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No instances yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70 max-w-sm mx-auto">
            Open a Blueprint from Workflows and click "Create Instance" to get started.
          </p>
          <div className="mt-4">
            <button type="button" onClick={() => navigate("/grace/library")}
              className="rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
              Go to Workflows
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <SearchFilterBar
              search={search}
              onSearchChange={setSearch}
              placeholder="Search instances…"
              filters={filterDefs}
              activeFilters={activeFilters}
              onFilterChange={(key, val) => setActiveFilters((p) => ({ ...p, [key]: val }))}
              sortOptions={SORT_OPTIONS}
              activeSort={activeSort}
              onSortChange={setActiveSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              resultCount={filtered.length}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">No instances match your search or filters.</p>
              <button type="button" onClick={() => { setSearch(""); setActiveFilters({}); }}
                className="mt-2 text-xs text-[var(--grace-accent)] hover:underline">Clear filters</button>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((inst) => (
                <div key={inst.id} className="relative group">
                  <InstanceCard instance={inst} onOpen={handleOpen} />
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(inst)}
                    className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete instance"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((inst) => (
                <InstanceRow key={inst.id} instance={inst} onOpen={handleOpen} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Instance"
        description={`Delete "${deleteTarget?.name ?? "this instance"}"? This action cannot be undone and will remove all local run history for this instance.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
