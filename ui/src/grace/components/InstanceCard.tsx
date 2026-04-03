/**
 * InstanceCard — reusable card for listing an Instance.
 * Embeddable in a list page, drawer, or canvas panel.
 *
 * Shows last run status + time when a run exists, instead of just creation date.
 */

import { ArrowRight, Box, Clock, CircleDot, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { Instance, InstanceStatus } from "../instances/instanceTypes";
import type { RunRecord, RunStatus } from "../providers/providerTypes";
import { runService } from "../providers/runService";
import { IdBadge } from "./IdBadge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<InstanceStatus, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "text-muted-foreground bg-muted/60 border-border" },
  ready:     { label: "Ready",     color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  running:   { label: "Running",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  paused:    { label: "Paused",    color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  completed: { label: "Completed", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  failed:    { label: "Failed",    color: "text-red-400 bg-red-500/10 border-red-400/40" },
  cancelled: { label: "Cancelled", color: "text-muted-foreground bg-muted/40 border-border" },
};

const RUN_STATUS_CONFIG: Partial<Record<RunStatus, { label: string; icon: React.ReactNode; color: string }>> = {
  completed: {
    label: "completed",
    icon: <CheckCircle2 size={10} />,
    color: "text-blue-400",
  },
  failed: {
    label: "failed",
    icon: <XCircle size={10} />,
    color: "text-red-400",
  },
  cancelled: {
    label: "cancelled",
    icon: <XCircle size={10} />,
    color: "text-muted-foreground/60",
  },
  running: {
    label: "running",
    icon: <Loader2 size={10} className="animate-spin" />,
    color: "text-emerald-400",
  },
  paused: {
    label: "paused",
    icon: <AlertTriangle size={10} />,
    color: "text-amber-400",
  },
};

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 0) return "just now";
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

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
  const latestRun: RunRecord | null = runService.getLatestRun(instance.id);
  const runCfg = latestRun ? RUN_STATUS_CONFIG[latestRun.status] : null;

  // The relevant timestamp: prefer run completion time, then start time, else creation date
  const runTimestamp = latestRun?.completedAt ?? latestRun?.startedAt ?? null;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)]/40 hover:bg-card/80",
        // Subtle red tint for failed cards
        instance.status === "failed" && "border-red-500/20",
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

      {/* Meta row: steps · ID · last run / created */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CircleDot size={11} />
          {stepCount} {stepCount === 1 ? "step" : "steps"}
        </span>
        <IdBadge id={instance.id} />
        <span className="ml-auto flex items-center gap-1.5">
          {latestRun && runCfg ? (
            <>
              <span className={cn("flex items-center gap-1", runCfg.color)}>
                {runCfg.icon}
                <span>{runCfg.label}</span>
              </span>
              <span className="text-muted-foreground/40">·</span>
              <Clock size={10} className="text-muted-foreground/50" />
              <span className="text-muted-foreground/70">
                {runTimestamp ? timeAgo(runTimestamp) : formatDate(instance.createdAt)}
              </span>
            </>
          ) : latestRun ? (
            <>
              <Clock size={10} />
              <span>Last run {runTimestamp ? timeAgo(runTimestamp) : formatDate(instance.createdAt)}</span>
            </>
          ) : (
            <>
              <Clock size={10} />
              <span>{formatDate(instance.createdAt)}</span>
            </>
          )}
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
