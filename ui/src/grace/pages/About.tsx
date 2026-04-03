import { Info } from "lucide-react";

export function GraceAbout() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform information and version details.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white text-lg font-bold"
              style={{ background: "var(--grace-accent)" }}
            >
              K
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Kodavara</div>
              <div className="text-base font-bold tracking-wide">GRACE</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generative Runtime Agent Coordination Engine — an agent orchestration platform for
            coordinating AI-powered workflows across teams and environments.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <Row label="Platform" value="Kodavara GRACE" />
          <Row label="Edition" value="Self-hosted" />
          <Row label="Documentation" value="Coming soon" muted />
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-accent/20 px-4 py-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Full documentation and release notes will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </span>
    </div>
  );
}
