/**
 * InstanceCard — reusable card for listing an Instance.
 * Embeddable in a list page, drawer, or canvas panel.
 */

import { ArrowRight, Box, Clock, CircleDot } from "lucide-react";
import type { Instance, InstanceStatus } from "../instances/instanceTypes";
import { IdBadge } from "./IdBadge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<InstanceStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground bg-muted/60 border-border" },
  ready: { label: "Ready", color: "text-sky-600 bg-sky-500/10 border-sky-500/30" },
  running: { label: "Running", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  paused: { label: "Paused", color: "text-amber-600 bg-amber-500/10 border-amber-500/30" },
  completed: { label: "Completed", color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  failed: { label: "Failed", color: "text-destructive bg-destructive/10 border-destructive/30" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted/40 border-border" },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

interface InstanceCardProps {
  instance: Instance;
  onOpen: (instance: Instance) => void;
  className?: string;
}

export function InstanceCard({ instance, onOpen, className }: InstanceCardProps) {
  const statusCfg = STATUS_CONFIG[instance.status] ?? STATUS_CONFIG.draft;
  const stepCount = instance.graphSnapshot.length;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)]/40 hover:bg-card/80",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10">
          <Box size={15} className="text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wide rounded border px-1.5 py-0.5",
                statusCfg.color
              )}
            >
              {statusCfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground/60">from {instance.blueprintName}</span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground leading-tight">{instance.name}</h3>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CircleDot size={11} />
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
        <IdBadge id={instance.id} />
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={11} />
          {formatDate(instance.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/60">
        <button
          type="button"
          onClick={() => onOpen(instance)}
          className="ml-auto flex items-center gap-1 rounded border border-[var(--grace-accent)] px-2.5 py-1 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]"
        >
          Open in Studio
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
