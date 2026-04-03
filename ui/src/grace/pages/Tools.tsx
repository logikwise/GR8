import { Wrench } from "lucide-react";

export function GraceTools() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tools are external capabilities available to agents during runs.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <Wrench size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Tools management coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          This panel will allow you to register, configure, and test tools available to agent instances.
        </p>
      </div>
    </div>
  );
}
