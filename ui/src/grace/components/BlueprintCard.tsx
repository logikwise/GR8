/**
 * BlueprintCard — reusable card for listing a Blueprint.
 * Designed to be embeddable in a list page, a drawer, or a canvas panel
 * without layout assumptions.
 */

import { ArrowRight, Layers, Users, Zap } from "lucide-react";
import type { Blueprint } from "../blueprints/blueprintTypes";
import { cn } from "@/lib/utils";

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  "single-agent": "Single Agent",
  "multi-agent": "Multi-Agent",
  swarm: "Swarm",
};

interface BlueprintCardProps {
  blueprint: Blueprint;
  onOpen: (blueprint: Blueprint) => void;
  className?: string;
}

export function BlueprintCard({ blueprint, onOpen, className }: BlueprintCardProps) {
  const typeLabel = WORKFLOW_TYPE_LABELS[blueprint.workflowType] ?? blueprint.workflowType;
  const stepCount = blueprint.steps.length;
  const hasSpecialists = (blueprint.agentConfig.specialists?.length ?? 0) > 0;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)]/40 hover:bg-card/80",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium uppercase tracking-wide rounded border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] px-1.5 py-0.5">
              Blueprint
            </span>
            {blueprint.ui?.category && (
              <span className="text-[10px] text-muted-foreground/70">{blueprint.ui.category}</span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-foreground leading-tight">{blueprint.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{blueprint.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers size={11} />
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
        <span className="flex items-center gap-1">
          {hasSpecialists ? <Users size={11} /> : <Zap size={11} />}
          {typeLabel}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">v{blueprint.version}</span>
      </div>

      {blueprint.ui?.tags && blueprint.ui.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {blueprint.ui.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border/60">
        <button
          type="button"
          onClick={() => onOpen(blueprint)}
          className="ml-auto flex items-center gap-1 rounded border border-[var(--grace-accent)] px-2.5 py-1 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]"
        >
          Open in Studio
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
