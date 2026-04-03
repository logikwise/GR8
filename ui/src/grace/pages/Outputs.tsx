/**
 * Library (formerly Outputs) — Phase 3
 *
 * The Library is the raw artifacts/outputs/files surface for completed runs.
 * Structured to support future file browsing, filtering by type/run/instance,
 * and download/export flows.
 *
 * TODO (Phase 4): Wire to GET /api/library or GET /api/runs/:id/outputs.
 * GRACE-REVIEW: Output metadata (run ID, instance ID, type, size, created)
 * is designed for future Mission Control trace and cost analytics.
 */

import { FolderOpen, FileText, FileJson, BarChart2, File } from "lucide-react";

const OUTPUT_TYPE_ICONS: Record<string, React.ReactNode> = {
  report: <FileText size={14} className="text-[var(--grace-accent)]/70" />,
  json: <FileJson size={14} className="text-sky-500/70" />,
  file: <File size={14} className="text-muted-foreground/60" />,
  data: <BarChart2 size={14} className="text-emerald-500/70" />,
};

export function GraceOutputs() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outputs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Artifacts, files, and structured outputs produced by agent runs. Browse, filter, and export results.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <FolderOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Outputs is empty</p>
        <p className="mt-1 text-xs text-muted-foreground/70 max-w-sm mx-auto">
          Outputs from completed Instance runs will appear here. Run an Instance from Studio to generate artifacts.
        </p>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {["Reports", "JSON / Data", "Files", "Raw Outputs"].map((cat, i) => (
          <div key={cat} className="rounded-lg border border-border bg-card p-4 opacity-60">
            <div className="flex items-center gap-2 mb-1">
              {[<FileText size={14} />, <FileJson size={14} />, <File size={14} />, <BarChart2 size={14} />][i]}
              <span className="text-sm font-medium text-muted-foreground">{cat}</span>
            </div>
            <p className="text-xs text-muted-foreground/60">No {cat.toLowerCase()} yet</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phase 3 Note</p>
        <p className="text-sm text-muted-foreground">
          The Library will surface run outputs with filtering by type, run, instance, and date range in Phase 4. Output metadata is structured for future cost/trace analytics in Mission Control.
        </p>
      </div>
    </div>
  );
}
