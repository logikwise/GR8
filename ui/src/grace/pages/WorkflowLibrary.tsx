/**
 * WorkflowLibrary — Phase 3 (visibly renamed to "Workflows")
 *
 * Surfaces:
 * - Blueprint list with search / filter / sort / card-list toggle
 * - "Manage" action per blueprint (opens ManageBlueprintModal)
 * - "Create Workflow" (opens CreateWorkflowModal wizard)
 * - "Import Blueprint" (file / paste / URL)
 *
 * Blueprint management (Manage, Duplicate, Export, Syntax Check) lives here only.
 * Studio blueprint mode is preview/template mode — no management actions there.
 *
 * TODO (Phase 4): Replace blueprintService with GET/POST /api/blueprints.
 */

import { useState, useMemo, useRef } from "react";
import { BookOpen, Plus, Upload, FileJson, Link as LinkIcon, AlertCircle, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { blueprintService } from "../blueprints/blueprintService";
import { BlueprintCard } from "../components/BlueprintCard";
import { ManageBlueprintModal } from "../components/ManageBlueprintModal";
import { CreateWorkflowModal } from "../components/CreateWorkflowModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SearchFilterBar, type FilterDef, type SortOption } from "../components/SearchFilterBar";
import type { Blueprint } from "../blueprints/blueprintTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DragEvent, ChangeEvent } from "react";

type ImportTab = "file" | "paste" | "url";

// ─── Import Modal ──────────────────────────────────────────────────────────────

function ImportBlueprintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<ImportTab>("file");
  const [dragging, setDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTab("file"); setDragging(false); setDroppedFile(null);
    setPasteContent(""); setUrlValue(""); setError(null);
  }
  function handleClose() { reset(); onClose(); }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false); setError(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(json|yaml|yml)$/)) { setError("Only .json, .yaml, or .yml files are supported."); return; }
    setDroppedFile(file);
  }
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(json|yaml|yml)$/)) { setError("Only .json, .yaml, or .yml files are supported."); return; }
    setDroppedFile(file);
  }

  const canImport =
    (tab === "file" && !!droppedFile) ||
    (tab === "paste" && pasteContent.trim().length > 0) ||
    (tab === "url" && urlValue.trim().length > 0);

  const TABS: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: "file", label: "File", icon: <FileJson size={14} /> },
    { id: "paste", label: "Paste JSON / YAML", icon: <Upload size={14} /> },
    { id: "url", label: "URL", icon: <LinkIcon size={14} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Blueprint</DialogTitle>
          <DialogDescription>Import a blueprint from a file, pasted content, or a remote URL.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setError(null); }}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="mt-1">
          {tab === "file" && (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn("flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors select-none",
                dragging || droppedFile ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)]" :
                "border-border bg-muted/20 hover:border-[var(--grace-accent)]/50 hover:bg-muted/40")}>
              <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleFileChange} />
              {droppedFile ? (
                <><FileJson size={28} className="text-[var(--grace-accent)]" />
                  <div><p className="text-sm font-medium text-[var(--grace-accent)]">{droppedFile.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{(droppedFile.size / 1024).toFixed(1)} KB — click to change</p></div></>
              ) : (
                <><Upload size={28} className="text-muted-foreground/50" />
                  <div><p className="text-sm font-medium">Drop a file here or click to browse</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Supports .json, .yaml, .yml blueprint files</p></div></>
              )}
            </div>
          )}
          {tab === "paste" && (
            <Textarea value={pasteContent} onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`Paste blueprint JSON or YAML here...\n\n{\n  "name": "My Blueprint",\n  "steps": [...]\n}`}
              className="min-h-44 resize-y font-mono text-xs" />
          )}
          {tab === "url" && (
            <div className="space-y-2">
              <Input type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/blueprint.json" />
              <p className="text-xs text-muted-foreground">The URL must return a valid JSON or YAML blueprint. CORS-permissive endpoints only.</p>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" disabled={!canImport}
            style={{ background: canImport ? "var(--grace-accent)" : undefined, color: canImport ? "var(--grace-accent-foreground)" : undefined }}
            onClick={() => setError("Blueprint import is not yet wired — paste/file parsing coming in Phase 4.")}>
            Import Blueprint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filters / Sort config ─────────────────────────────────────────────────────

const SORT_OPTIONS: SortOption[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "steps-desc", label: "Most Steps" },
  { value: "updated-desc", label: "Recently Updated" },
  { value: "created-desc", label: "Newest First" },
];

function buildFilterDefs(blueprints: Blueprint[]): FilterDef[] {
  const categories = [...new Set(blueprints.map((b) => b.ui?.category).filter(Boolean) as string[])];
  const types = [...new Set(blueprints.map((b) => b.workflowType))];
  const defs: FilterDef[] = [];
  if (categories.length > 0) defs.push({ key: "category", label: "Category", options: categories });
  if (types.length > 0) defs.push({ key: "type", label: "Type", options: types });
  return defs;
}

function sortBlueprints(list: Blueprint[], sort: string): Blueprint[] {
  return [...list].sort((a, b) => {
    if (sort === "name-asc") return a.name.localeCompare(b.name);
    if (sort === "name-desc") return b.name.localeCompare(a.name);
    if (sort === "steps-desc") return b.steps.length - a.steps.length;
    if (sort === "updated-desc") return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    if (sort === "created-desc") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    return 0;
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function GraceWorkflowLibrary() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [managingBlueprint, setManagingBlueprint] = useState<Blueprint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Blueprint | null>(null);

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState("name-asc");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const allBlueprints = useMemo(() => blueprintService.getAll(), [refreshKey]);

  const filterDefs = useMemo(() => buildFilterDefs(allBlueprints), [allBlueprints]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = allBlueprints.filter((bp) => {
      if (q && !bp.name.toLowerCase().includes(q) && !bp.description.toLowerCase().includes(q) &&
          !(bp.ui?.tags ?? []).some((t) => t.toLowerCase().includes(q))) return false;
      if (activeFilters.category && bp.ui?.category !== activeFilters.category) return false;
      if (activeFilters.type && bp.workflowType !== activeFilters.type) return false;
      return true;
    });
    return sortBlueprints(list, activeSort);
  }, [allBlueprints, search, activeFilters, activeSort]);

  function handleOpen(bp: Blueprint) { navigate(`/grace/studio/blueprint/${bp.id}`); }

  function handleManage(bp: Blueprint) { setManagingBlueprint(bp); }

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleUpdated() {
    setManagingBlueprint(null);
    setRefreshKey((k) => k + 1);
  }

  function handleCreated() {
    setCreateOpen(false);
    setRefreshKey((k) => k + 1);
  }

  function handleDeleteBlueprint() {
    if (!deleteTarget) return;
    blueprintService.remove(deleteTarget.id);
    setDeleteTarget(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage Blueprint workflows. Blueprints are templates — create an Instance to execute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--grace-accent)] hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]">
            <Upload size={14} />Import
          </button>
          <button type="button" onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
            <Plus size={14} />Create Workflow
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      {allBlueprints.length > 0 && (
        <div className="mb-4">
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search workflows…"
            filters={filterDefs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            sortOptions={SORT_OPTIONS}
            activeSort={activeSort}
            onSortChange={setActiveSort}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            resultCount={filtered.length}
          />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && allBlueprints.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No workflows yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Create a new workflow or import a Blueprint to get started.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
              <Plus size={14} />Create Workflow
            </button>
            <button type="button" onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--grace-accent)] hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]">
              <Upload size={14} />Import Blueprint
            </button>
          </div>
        </div>
      )}

      {/* No search match */}
      {filtered.length === 0 && allBlueprints.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">No workflows match your current search or filters.</p>
          <button type="button" onClick={() => { setSearch(""); setActiveFilters({}); }}
            className="mt-2 text-xs text-[var(--grace-accent)] hover:underline">Clear filters</button>
        </div>
      )}

      {/* Blueprint list */}
      {filtered.length > 0 && (
        <div className={cn(
          viewMode === "card" ? "grid gap-3 sm:grid-cols-2" : "space-y-1.5"
        )}>
          {filtered.map((bp) => (
            <div key={bp.id} className="relative group">
              <BlueprintCard
                blueprint={bp}
                onOpen={handleOpen}
                onManage={handleManage}
                viewMode={viewMode}
              />
              <button
                type="button"
                onClick={() => setDeleteTarget(bp)}
                className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 z-10"
                title="Delete blueprint"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ImportBlueprintModal open={importOpen} onClose={() => setImportOpen(false)} />

      <CreateWorkflowModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />

      {managingBlueprint && (
        <ManageBlueprintModal
          blueprint={managingBlueprint}
          open={!!managingBlueprint}
          onClose={() => setManagingBlueprint(null)}
          onUpdated={handleUpdated}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Blueprint"
        description={`Delete "${deleteTarget?.name ?? "this blueprint"}"? This removes the blueprint template. Existing instances derived from it are not affected.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteBlueprint}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
