import { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { instanceService } from "../instances/instanceService";
import { InstanceCard } from "../components/InstanceCard";
import type { Instance } from "../instances/instanceTypes";

export function GraceInstances() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<Instance[]>([]);

  useEffect(() => {
    setInstances(instanceService.getAll());
  }, []);

  function handleOpen(instance: Instance) {
    navigate(`/grace/studio/instance/${instance.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instances are executable snapshots derived from Blueprints. Only Instances can be run.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/grace/library")}
          className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]"
        >
          Create from Blueprint
        </button>
      </div>

      {instances.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <Layers size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No instances yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Open a Blueprint from the Workflow Library and click "Create Instance" to get started.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate("/grace/library")}
              className="rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]"
            >
              Go to Workflow Library
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {instances.map((inst) => (
            <InstanceCard key={inst.id} instance={inst} onOpen={handleOpen} />
          ))}
        </div>
      )}

      {instances.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Phase 2 Note</p>
          <p className="text-sm text-muted-foreground">
            Instances are currently stored locally in your browser. In Phase 3, Instances will sync with the backend and existing Runs from the legacy system will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
