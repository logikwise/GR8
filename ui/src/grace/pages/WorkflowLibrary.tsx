import { BookOpen, Plus } from "lucide-react";

export function GraceWorkflowLibrary() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflow Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse, create, and manage blueprints. Blueprints cannot be run directly — create an Instance to execute.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
          <Plus size={14} />
          New Blueprint
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No blueprints yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Blueprints are templates. Create one to get started, then instantiate it to run.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Phase 1 Note</p>
        <p className="text-sm text-muted-foreground">
          The Workflow Library will surface existing Routines as Blueprints in a future phase. For now, manage routines
          directly via the Workspace view.
        </p>
      </div>
    </div>
  );
}
