import { Cpu, AlertCircle } from "lucide-react";

export function GraceStudio() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[var(--grace-accent)]" />
          <span className="text-sm font-semibold">Studio</span>
          <span className="ml-2 rounded bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--grace-accent)] uppercase tracking-wide">
            Coming soon
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-border bg-card/30 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Instance</p>
          <div className="space-y-1">
            {["Steps", "Skills", "Tools", "Outputs"].map((section) => (
              <div
                key={section}
                className="rounded px-2 py-1.5 text-xs text-muted-foreground/60 cursor-default"
              >
                {section}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background/50 p-8 text-center">
          <AlertCircle size={36} className="text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Studio is not yet available</p>
            <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">
              Studio will allow you to build, inspect, and observe agent Instance runs. Select an Instance from the
              Instances page to begin.
            </p>
          </div>
        </div>

        <aside className="w-64 shrink-0 border-l border-border bg-card/30 p-3 flex flex-col">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Chat</p>
          <div className="flex-1 rounded border border-dashed border-border/50 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50">No active run</p>
          </div>
        </aside>
      </div>

      <div className="border-t border-border bg-card/30 px-4 py-2 h-28">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Console</p>
        <div className="font-mono text-xs text-muted-foreground/50">
          &gt; Waiting for run...
        </div>
      </div>
    </div>
  );
}
