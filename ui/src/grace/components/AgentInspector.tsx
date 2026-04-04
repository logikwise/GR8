/**
 * AgentInspector
 *
 * Side panel showing details for a selected agent node.
 * Mirrors the layout of StepInspector.
 */

import { X, User, Cpu, Link2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioAgent } from "./GraphCanvas";

interface AgentInspectorProps {
  agent: StudioAgent;
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[10px]">
      <span className="text-muted-foreground/50 w-14 shrink-0">{label}</span>
      <span className="font-mono text-muted-foreground/70 truncate">{value}</span>
    </div>
  );
}

export function AgentInspector({ agent, onClose, className }: AgentInspectorProps) {
  const typeLabel = agent.isPrimary ? "Primary" : "Specialist";

  return (
    <div
      className={cn(
        "flex w-64 shrink-0 flex-col border-l border-border bg-card overflow-y-auto",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 border-b border-border/60 px-3 py-2.5 shrink-0">
        {/* Avatar */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--grace-accent)]/40 text-[11px] font-bold text-[var(--grace-accent)] mt-0.5">
          {agent.label.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/40 leading-none mb-0.5">
            Agent · {typeLabel}
          </p>
          <p className="text-xs font-semibold leading-snug truncate">{agent.label}</p>
          <p className="text-[10px] text-muted-foreground/50 truncate capitalize">{agent.role}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/40 transition-colors mt-0.5"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Type badge */}
        <div>
          <SectionLabel>Type</SectionLabel>
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
              agent.isPrimary
                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                : "border-indigo-400/30 bg-indigo-500/10 text-indigo-400",
            )}>
              {agent.isPrimary ? (
                <><Shield size={8} /> Primary</>
              ) : (
                <><Cpu size={8} /> Specialist</>
              )}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
              agent.linked
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-border bg-muted/30 text-muted-foreground/60",
            )}>
              <Link2 size={8} />
              {agent.linked ? "Linked" : "Unlinked"}
            </span>
          </div>
        </div>

        {/* Role */}
        <div>
          <SectionLabel>Role</SectionLabel>
          <div className="flex items-center gap-1.5">
            <User size={10} className="text-muted-foreground/40 shrink-0" />
            <span className="text-xs text-muted-foreground capitalize">{agent.role}</span>
          </div>
        </div>

        {/* Capabilities (placeholder) */}
        <div>
          <SectionLabel>Capabilities</SectionLabel>
          <p className="text-[10px] text-muted-foreground/30 italic">
            Capabilities are defined in the agent configuration.
          </p>
        </div>

        {/* Metadata */}
        <div className="border-t border-border/40 pt-3">
          <SectionLabel>Metadata</SectionLabel>
          <div className="space-y-1">
            <Row label="ID" value={agent.id} />
            <Row label="Label" value={agent.label} />
            <Row label="Role" value={agent.role} />
          </div>
        </div>
      </div>
    </div>
  );
}
