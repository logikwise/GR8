import { Layers, Plus } from "lucide-react";

export function GraceInstances() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instances are executable snapshots derived from Blueprints. Only Instances can be run.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
          <Plus size={14} />
          Create Instance
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No instances yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Create an instance from a Blueprint in the Workflow Library, then open it in Studio to run it.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Phase 1 Note</p>
        <p className="text-sm text-muted-foreground">
          In a future phase, Instances will be wired to existing Runs. Active runs from the legacy system will appear
          here automatically.
        </p>
      </div>
    </div>
  );
}
