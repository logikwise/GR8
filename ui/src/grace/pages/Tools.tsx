/**
 * Tools — Phase 5
 *
 * Improvements:
 *  - Search/filter/view toggle for registered tools
 *  - Sample tool entries
 *  - Delete with ConfirmDialog
 *  - Import source cards (deferred to Phase 6)
 *
 * TODO (Phase 6): Replace mock data with GET /api/tools.
 */

import { useState, useMemo } from "react";
import {
  Wrench, Plus, Upload, GitBranch, Globe, Package,
  Server, Puzzle, Search, LayoutGrid, List, Trash2, X,
} from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IdBadge } from "../components/IdBadge";
import { cn } from "@/lib/utils";

interface ToolEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: string;
  status: "active" | "inactive";
  createdAt: string;
}

const SAMPLE_TOOLS: ToolEntry[] = [
  {
    id: "tool-file-io",
    name: "File I/O",
    description: "Read and write files from the workspace filesystem. Supports streaming reads for large files.",
    version: "1.0.0",
    provider: "built-in",
    status: "active",
    createdAt: "2024-11-01",
  },
  {
    id: "tool-http-request",
    name: "HTTP Request",
    description: "Make GET, POST, PUT, DELETE requests to external APIs with configurable headers and timeout.",
    version: "2.1.0",
    provider: "built-in",
    status: "active",
    createdAt: "2024-12-01",
  },
  {
    id: "tool-code-exec",
    name: "Code Executor",
    description: "Execute sandboxed code snippets in Python, JS, or Bash and return stdout/stderr.",
    version: "0.8.2",
    provider: "plugin",
    status: "inactive",
    createdAt: "2025-01-15",
  },
];

const IMPORT_SOURCES = [
  { id: "register",  label: "Register Tool",       description: "Define a new tool endpoint and configure its input/output schema.", icon: <Server size={15} /> },
  { id: "create",    label: "Create New",           description: "Scaffold a new tool from a template with metadata and schema.",     icon: <Plus size={15} /> },
  { id: "upload",    label: "Upload / Import File",  description: "Import a tool definition from a .json or .yaml package.",          icon: <Upload size={15} /> },
  { id: "git",       label: "Import from Git",       description: "Pull a tool directly from a Git repository.",                      icon: <GitBranch size={15} /> },
  { id: "url",       label: "Import from URL",       description: "Fetch a tool definition from any public endpoint.",                icon: <Globe size={15} /> },
  { id: "plugins",   label: "Plugin Marketplace",   description: "Browse tools available through the platform plugin system.",       icon: <Puzzle size={15} /> },
  { id: "community", label: "Community Tools",      description: "Browse and install verified community-built tools.",               icon: <Package size={15} /> },
];

const STATUS_STYLES: Record<ToolEntry["status"], string> = {
  active:   "bg-emerald-500/10 text-emerald-600",
  inactive: "bg-muted/60 text-muted-foreground",
};

function ToolCard({ tool, onDelete }: { tool: ToolEntry; onDelete: () => void }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)]/40 transition-colors">
      <button type="button" onClick={onDelete}
        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
        title="Remove tool">
        <Trash2 size={11} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
          <Wrench size={14} className="text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{tool.name}</span>
            <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground font-mono">v{tool.version}</span>
            <span className={cn("text-[10px] rounded px-1.5 py-0.5", STATUS_STYLES[tool.status])}>{tool.status}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{tool.description}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[9px] rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground/70">{tool.provider}</span>
            <IdBadge id={tool.id} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolRow({ tool, onDelete }: { tool: ToolEntry; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 hover:border-[var(--grace-accent)]/40 transition-colors">
      <Wrench size={13} className="text-muted-foreground/50 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{tool.name}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">v{tool.version}</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{tool.description}</span>
      </div>
      <IdBadge id={tool.id} />
      <span className={cn("text-[10px] rounded px-1.5 py-0.5 shrink-0", STATUS_STYLES[tool.status])}>{tool.status}</span>
      <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground shrink-0">{tool.provider}</span>
      <button type="button" onClick={onDelete}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function GraceTools() {
  const [tools, setTools] = useState<ToolEntry[]>(SAMPLE_TOOLS);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteTarget, setDeleteTarget] = useState<ToolEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return tools;
    return tools.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.provider.toLowerCase().includes(q)
    );
  }, [tools, search]);

  function handleDelete(tool: ToolEntry) {
    setTools((prev) => prev.filter((t) => t.id !== tool.id));
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools are external capabilities available to agents during runs. Register, import, and manage tools for your workspace.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Registered Tools</p>
          <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">{tools.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools…"
                className="w-40 rounded border border-border bg-muted/20 py-1 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="flex rounded border border-border overflow-hidden">
              <button type="button" onClick={() => setViewMode("card")}
                className={cn("flex items-center justify-center w-7 h-7", viewMode === "card" ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]" : "text-muted-foreground/50 hover:text-foreground")}>
                <LayoutGrid size={12} />
              </button>
              <button type="button" onClick={() => setViewMode("list")}
                className={cn("flex items-center justify-center w-7 h-7 border-l border-border", viewMode === "list" ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]" : "text-muted-foreground/50 hover:text-foreground")}>
                <List size={12} />
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-xs text-muted-foreground/60">No tools match your search.</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onDelete={() => setDeleteTarget(tool)} />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((tool) => (
              <ToolRow key={tool.id} tool={tool} onDelete={() => setDeleteTarget(tool)} />
            ))}
          </div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Import Sources</p>
        <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">Phase 6</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMPORT_SOURCES.map((src) => (
          <div key={src.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 opacity-50 cursor-not-allowed"
            title="Coming in Phase 6">
            <div className="mt-0.5 shrink-0 text-muted-foreground/60">{src.icon}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">{src.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/60 leading-snug">{src.description}</div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Tool"
        description={`Remove "${deleteTarget?.name ?? "this tool"}" from the registry? (Local change in Phase 5 — does not affect the backend.)`}
        confirmLabel="Remove"
        variant="warning"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
