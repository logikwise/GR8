/**
 * StepInspector
 *
 * Reusable right-side inspection panel for a single workflow step.
 * Used by: FlowView, GraphCanvas, and future runtime trace views.
 *
 * Receives step data as props; parent controls open/close.
 * Rendered as a fixed-width right drawer inside the Studio center panel.
 */

import { X, Zap, Wrench, FileText, CircleDot, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowStep } from "./FlowStepCard";

interface StepInspectorProps {
  step: FlowStep | null;
  onClose: () => void;
  className?: string;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-1.5">
      {children}
    </p>
  );
}

function Chip({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border",
        accent
          ? "border-[var(--grace-accent)]/25 bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

export function StepInspector({ step, onClose, className }: StepInspectorProps) {
  if (!step) return null;

  return (
    <div
      className={cn(
        "flex w-64 shrink-0 flex-col border-l border-border bg-card overflow-y-auto",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 shrink-0">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--grace-accent)]/50 text-[9px] font-bold text-[var(--grace-accent)]">
          S
        </div>
        <p className="flex-1 text-xs font-medium truncate">{step.name}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/40 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Status */}
        <div>
          <SectionLabel>Status</SectionLabel>
          <div className="flex items-center gap-1.5">
            <CircleDot size={10} className="text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/50">idle — no active run</span>
          </div>
        </div>

        {/* Agent role */}
        {step.agentRole && (
          <div>
            <SectionLabel>Agent Role</SectionLabel>
            <span className="inline-block rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground capitalize">
              {step.agentRole}
            </span>
          </div>
        )}

        {/* Description */}
        {step.description && (
          <div>
            <SectionLabel>Description</SectionLabel>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
          </div>
        )}

        {/* Skills */}
        {step.skills && step.skills.length > 0 && (
          <div>
            <SectionLabel>Skills ({step.skills.length})</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {step.skills.map((s) => (
                <Chip key={s.id} icon={<Zap size={8} />} label={s.name} accent />
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {step.tools && step.tools.length > 0 && (
          <div>
            <SectionLabel>Tools ({step.tools.length})</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {step.tools.map((t) => (
                <Chip key={t.id} icon={<Wrench size={8} />} label={t.name} />
              ))}
            </div>
          </div>
        )}

        {/* Prompt */}
        {step.prompt ? (
          <div>
            <SectionLabel>Prompt</SectionLabel>
            <pre className="whitespace-pre-wrap text-[10px] text-muted-foreground/80 font-mono leading-relaxed bg-muted/30 rounded p-2 border border-border/50">
              {step.prompt}
            </pre>
          </div>
        ) : (
          <div>
            <SectionLabel>Prompt</SectionLabel>
            <p className="text-[10px] text-muted-foreground/30 italic">No prompt defined</p>
          </div>
        )}

        {/* Output definition */}
        {step.outputDef && (
          <div>
            <SectionLabel>Output</SectionLabel>
            <div className="flex items-start gap-1.5">
              <FileText size={10} className="text-muted-foreground/40 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">{step.outputDef}</p>
            </div>
          </div>
        )}

        {/* Future hooks placeholder */}
        <div className="border-t border-border/40 pt-3">
          <SectionLabel>Runtime trace</SectionLabel>
          <div className="flex items-center gap-1.5 opacity-30">
            <Terminal size={10} className="text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Available during runs</p>
          </div>
        </div>

        {/* Metadata */}
        <div>
          <SectionLabel>Metadata</SectionLabel>
          <div className="space-y-1">
            <div className="flex gap-2 text-[10px]">
              <span className="text-muted-foreground/50 w-12 shrink-0">ID</span>
              <span className="font-mono text-muted-foreground/70 truncate">{step.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
