import { FileOutput } from "lucide-react";

export function GraceOutputs() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Outputs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review artifacts, files, and structured outputs produced by agent runs.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
        <FileOutput size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No outputs yet</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Outputs from completed runs will appear here. Start an Instance run to generate outputs.
        </p>
      </div>
    </div>
  );
}
