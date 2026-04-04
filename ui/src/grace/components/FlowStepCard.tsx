/**
 * FlowStepCard — Phase 5
 *
 * Horizontal flow step card for the Studio Flow view.
 * Now accepts optional stepStatus from the active run record
 * so visual state reflects real execution progress.
 *
 * Statuses: idle | ready | running | waiting | human_review | completed | failed
 */

import { useState } from "react";
import { Zap, Wrench, ChevronDown, ChevronUp, Search, CircleDot, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus } from "../providers/providerTypes";

export interface FlowStep {
  id: string;
  name: string;
  description?: string;
  agentRole?: string;
  icon?: string;
  skills?: { id: string; name: string }[];
  tools?: { id: string; name: string }[];
  prompt?: string;
  outputDef?: string;
}

interface FlowStepCardProps {
  step: FlowStep;
  index: number;
  focused?: boolean;
  onInspect: (step: FlowStep) => void;
  /** Runtime step status from the active RunRecord — optional */
  stepStatus?: StepStatus;
}

const STATUS_DOT: Record<StepStatus, React.ReactNode> = {
  idle:         <CircleDot size={8} className="text-muted-foreground/30" />,
  ready:        <CircleDot size={8} className="text-sky-500" />,
  running:      <Loader2   size={8} className="text-emerald-500 animate-spin" />,
  waiting:      <Clock     size={8} className="text-amber-500" />,
  human_review: <Clock     size={8} className="text-purple-500" />,
  completed:    <CheckCircle2 size={8} className="text-blue-500" />,
  failed:       <XCircle   size={8} className="text-destructive" />,
};

const STATUS_LABEL: Record<StepStatus, string> = {
  idle:         "idle",
  ready:        "ready",
  running:      "running",
  waiting:      "waiting",
  human_review: "review",
  completed:    "done",
  failed:       "failed",
};

const STATUS_BORDER: Record<StepStatus, string> = {
  idle:         "",
  ready:        "border-sky-500/40",
  running:      "border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]",
  waiting:      "border-amber-500/40",
  human_review: "border-purple-500/40",
  completed:    "border-blue-500/30",
  failed:       "border-destructive/40",
};

export function FlowStepCard({ step, index, focused, onInspect, stepStatus }: FlowStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const status: StepStatus = stepStatus ?? "idle";

  const hasDetail =
    step.description ||
    (step.skills && step.skills.length > 0) ||
    (step.tools && step.tools.length > 0) ||
    step.prompt ||
    step.outputDef;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border transition-all duration-200 select-none",
        "min-w-[200px] max-w-[260px] shrink-0",
        focused
          ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] shadow-[0_0_0_2px_var(--grace-accent-muted)]"
          : status !== "idle" && STATUS_BORDER[status]
            ? `border bg-card ${STATUS_BORDER[status]}`
            : "border-border bg-card hover:border-[var(--grace-accent)]/50 hover:bg-card/80",
      )}
    >
      {/* Running pulse overlay */}
      {status === "running" && (
        <div className="absolute inset-0 rounded-xl bg-emerald-500/5 pointer-events-none animate-pulse" />
      )}

      {/* Collapsed header */}
      <div className="flex items-start gap-2.5 p-3">
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold mt-0.5",
            focused
              ? "border-[var(--grace-accent)] text-[var(--grace-accent)] bg-[var(--grace-accent)]/10"
              : status === "running"
                ? "border-emerald-500/60 text-emerald-600 bg-emerald-500/10"
                : status === "completed"
                  ? "border-blue-500/40 text-blue-600 bg-blue-500/10"
                  : status === "failed"
                    ? "border-destructive/40 text-destructive"
                    : "border-[var(--grace-accent)]/50 text-[var(--grace-accent)]",
          )}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold leading-tight">{step.name}</span>
            {step.agentRole && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground capitalize">
                {step.agentRole}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1">
            {STATUS_DOT[status]}
            <span className={cn(
              "text-[10px]",
              status === "running"   ? "text-emerald-600" :
              status === "completed" ? "text-blue-600" :
              status === "failed"    ? "text-destructive" :
              status === "waiting" || status === "human_review" ? "text-amber-600" :
              "text-muted-foreground/40"
            )}>
              {STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            title="Inspect step"
            onClick={() => onInspect(step)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-colors"
          >
            <Search size={11} />
          </button>
          {hasDetail && (
            <button
              type="button"
              title={expanded ? "Collapse" : "Expand"}
              onClick={() => setExpanded((e) => !e)}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/40 transition-colors"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="border-t border-border/50 px-3 pb-3 pt-2 space-y-2">
          {step.description && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
          )}

          {step.skills && step.skills.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-1">Skills</p>
              <div className="flex flex-wrap gap-1">
                {step.skills.map((s) => (
                  <span key={s.id} className="flex items-center gap-1 rounded border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--grace-accent)]">
                    <Zap size={8} />{s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step.tools && step.tools.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-1">Tools</p>
              <div className="flex flex-wrap gap-1">
                {step.tools.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Wrench size={8} />{t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step.prompt && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-1">Prompt</p>
              <p className="text-[11px] text-muted-foreground/80 font-mono leading-relaxed line-clamp-3">{step.prompt}</p>
            </div>
          )}

          {step.outputDef && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-1">Output</p>
              <p className="text-[11px] text-muted-foreground/80">{step.outputDef}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
