/**
 * Library — Phase 5
 *
 * Knowledge and resource library. Contains:
 *  - Document/resource list with search
 *  - Upload + import entry points (placeholders for Phase 6)
 *  - RAG source list placeholder
 *
 * TODO (Phase 6): Wire to GET /api/library or GET /api/knowledge-bases.
 */

import { useState, useMemo } from "react";
import {
  LibraryBig, FileText, Search, Upload, Link as LinkIcon,
  Database, Folder, Plus, Trash2, X,
} from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { cn } from "@/lib/utils";

interface LibraryEntry {
  id: string;
  name: string;
  type: "document" | "template" | "knowledge-base" | "dataset";
  description: string;
  size?: string;
  createdAt: string;
  tags?: string[];
}

const SAMPLE_ENTRIES: LibraryEntry[] = [
  {
    id: "lib-brand-guidelines",
    name: "Brand Guidelines",
    type: "document",
    description: "GRACE brand guidelines including tone of voice, visual identity, and naming conventions.",
    size: "2.4 MB",
    createdAt: "2025-01-10",
    tags: ["brand", "design"],
  },
  {
    id: "lib-agent-prompt-template",
    name: "Agent Prompt Template",
    type: "template",
    description: "Base prompt template for primary and specialist agent roles in GRACE workflows.",
    size: "12 KB",
    createdAt: "2025-01-20",
    tags: ["agent", "prompt"],
  },
  {
    id: "lib-company-kb",
    name: "Company Knowledge Base",
    type: "knowledge-base",
    description: "Indexed knowledge base for company documents, FAQs, and SOPs. Backed by vector search.",
    size: "48 MB",
    createdAt: "2025-02-01",
    tags: ["kb", "rag"],
  },
];

const TYPE_COLORS: Record<LibraryEntry["type"], string> = {
  document:       "bg-blue-500/10 text-blue-600",
  template:       "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]",
  "knowledge-base": "bg-emerald-500/10 text-emerald-600",
  dataset:        "bg-amber-500/10 text-amber-600",
};

const TYPE_ICON: Record<LibraryEntry["type"], React.ReactNode> = {
  document:       <FileText size={13} />,
  template:       <FileText size={13} />,
  "knowledge-base": <Database size={13} />,
  dataset:        <Folder size={13} />,
};

function LibraryCard({ entry, onDelete }: { entry: LibraryEntry; onDelete: () => void }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)]/40 transition-colors">
      <button type="button" onClick={onDelete}
        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
        title="Remove">
        <Trash2 size={11} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          entry.type === "knowledge-base"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            : entry.type === "template"
              ? "border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
              : "border-border bg-muted/30 text-muted-foreground",
        )}>
          {TYPE_ICON[entry.type]}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{entry.name}</span>
            <span className={cn("text-[10px] rounded px-1.5 py-0.5", TYPE_COLORS[entry.type])}>{entry.type}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{entry.description}</p>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
            {entry.size && <span>{entry.size}</span>}
            <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
          </div>
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.tags.map((tag) => (
                <span key={tag} className="text-[9px] rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GraceLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>(SAMPLE_ENTRIES);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LibraryEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.type.includes(q) ||
      (e.tags ?? []).some((t) => t.includes(q))
    );
  }, [entries, search]);

  function handleDelete(entry: LibraryEntry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared resources, knowledge bases, and documents available to agent workflows.
          </p>
        </div>
        <button type="button"
          title="Coming in Phase 6"
          className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground/40 cursor-not-allowed opacity-50">
          <Plus size={12} /> Add Resource
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources…"
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Resource grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <LibraryBig size={28} className="mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">
            {search ? "No resources match your search." : "No resources yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((entry) => (
            <LibraryCard key={entry.id} entry={entry} onDelete={() => setDeleteTarget(entry)} />
          ))}
        </div>
      )}

      {/* Import section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Add to Library</p>
          <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">Phase 6</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { icon: <Upload size={14} />, label: "Upload File",      desc: "Upload documents, PDFs, or datasets." },
            { icon: <LinkIcon size={14} />, label: "Import from URL", desc: "Fetch content from a public URL." },
            { icon: <Database size={14} />, label: "Create KB",       desc: "Build a new knowledge base." },
          ].map((item) => (
            <div key={item.label}
              className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-card/40 p-3 opacity-50 cursor-not-allowed"
              title="Coming in Phase 6">
              <div className="text-muted-foreground/40 mt-0.5">{item.icon}</div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">{item.label}</div>
                <div className="text-[10px] text-muted-foreground/50 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove from Library"
        description={`Remove "${deleteTarget?.name ?? "this resource"}" from the library? (Local change in Phase 5.)`}
        confirmLabel="Remove"
        variant="warning"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
