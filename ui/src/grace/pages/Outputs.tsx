/**
 * Outputs — Phase 9
 *
 * Displays run artifacts persisted to grace.outputs.v1 via outputService.
 * Populated when Studio polls a completed run and finds outputs.
 */

import { useState, useMemo } from "react";
import {
  FolderOpen, FileText, FileJson, BarChart2, File, Image,
  Link as LinkIcon, Search, Trash2, X, Download,
} from "lucide-react";
import { outputService, type OutputRecord, type OutputRecordType } from "../outputs/outputService";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { cn } from "@/lib/utils";

const OUTPUT_ICON: Record<OutputRecordType, React.ReactNode> = {
  report: <FileText size={13} className="text-[var(--grace-accent)]/70" />,
  json:   <FileJson size={13} className="text-sky-500/70" />,
  file:   <File     size={13} className="text-muted-foreground/60" />,
  data:   <BarChart2 size={13} className="text-emerald-500/70" />,
  image:  <Image    size={13} className="text-pink-500/70" />,
  link:   <LinkIcon size={13} className="text-blue-500/70" />,
  text:   <FileText size={13} className="text-amber-500/70" />,
};

const OUTPUT_COLOR: Record<OutputRecordType, string> = {
  report: "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]",
  json:   "bg-sky-500/10 text-sky-600",
  file:   "bg-muted/40 text-muted-foreground",
  data:   "bg-emerald-500/10 text-emerald-600",
  image:  "bg-pink-500/10 text-pink-600",
  link:   "bg-blue-500/10 text-blue-600",
  text:   "bg-amber-500/10 text-amber-600",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)  return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function OutputCard({ record, onDelete }: { record: OutputRecord; onDelete: () => void }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)]/40 transition-colors">
      <button type="button" onClick={onDelete}
        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
        title="Delete output">
        <Trash2 size={11} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border",
          OUTPUT_COLOR[record.type],
        )}>
          {OUTPUT_ICON[record.type]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{record.label}</span>
            <span className={cn("text-[10px] rounded px-1.5 py-0.5 shrink-0", OUTPUT_COLOR[record.type])}>
              {record.type}
            </span>
          </div>

          {record.content && (
            <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2 font-mono">
              {record.content.slice(0, 200)}
            </p>
          )}

          {record.reference && (
            <a href={record.reference} target="_blank" rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-xs text-[var(--grace-accent)] hover:underline truncate">
              <LinkIcon size={10} />{record.reference.slice(0, 60)}
            </a>
          )}

          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50 flex-wrap">
            {record.instanceName && <span>{record.instanceName}</span>}
            {record.stepName && <span>→ {record.stepName}</span>}
            <span>{timeAgo(record.timestamp)}</span>
            {record.sizeBytes && <span>{(record.sizeBytes / 1024).toFixed(1)} KB</span>}
          </div>
        </div>
      </div>

      {record.reference && (
        <a href={record.reference} target="_blank" rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-[var(--grace-accent)] transition-colors"
          title="Open output">
          <Download size={11} />
        </a>
      )}
    </div>
  );
}

export function GraceOutputs() {
  const [records, setRecords] = useState<OutputRecord[]>(() => outputService.getAll());
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OutputRecord | null>(null);
  const [typeFilter, setTypeFilter] = useState<OutputRecordType | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (!q) return true;
      return (
        r.label.toLowerCase().includes(q) ||
        r.instanceName?.toLowerCase().includes(q) ||
        r.stepName?.toLowerCase().includes(q) ||
        r.type.includes(q)
      );
    });
  }, [records, search, typeFilter]);

  function handleDelete(record: OutputRecord) {
    outputService.delete(record.id);
    setRecords(outputService.getAll());
    setDeleteTarget(null);
  }

  const types = useMemo(() => {
    const seen = new Set<OutputRecordType>();
    records.forEach((r) => seen.add(r.type));
    return Array.from(seen);
  }, [records]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outputs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Artifacts, files, and structured outputs produced by agent runs.
          </p>
        </div>
        {records.length > 0 && (
          <span className="text-sm text-muted-foreground/50">{records.length} output{records.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {records.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search outputs…"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all" />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex gap-1">
            {(["all", ...types] as (OutputRecordType | "all")[]).map((t) => (
              <button key={t} type="button" onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded border px-2.5 py-1.5 text-xs capitalize transition-colors",
                  typeFilter === t
                    ? "border-[var(--grace-accent)]/50 bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}>
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <FolderOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {records.length === 0 ? "No outputs yet." : "No outputs match your filters."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-sm mx-auto">
            {records.length === 0
              ? "Run an Instance from Studio to generate artifacts. Outputs appear here when runs complete."
              : "Try adjusting your search or type filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((record) => (
            <OutputCard key={record.id} record={record} onDelete={() => setDeleteTarget(record)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Output"
        description={`Delete "${deleteTarget?.label ?? "this output"}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
