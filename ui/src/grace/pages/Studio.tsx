/**
 * Studio — Phase 3
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Header: back · name · badge · [Panel toggle] · [G|F|R] · CTA │
 *   ├───────────────┬─────────────────────────────────┬──────────────┤
 *   │  Left panel   │   Center canvas                 │  Right chat  │
 *   │  (toggleable) │   Graph ← or → Flow             │  panel       │
 *   │  ~220px       │   flex-1                        │  240px       │
 *   ├───────────────┴─────────────────────────────────┴──────────────┤
 *   │  Bottom: [Logs][Steps][Skills][Tools][Outputs][Meta][Trace]    │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Blueprint mode: read-only template. "Create Instance" is the only CTA.
 *   No management actions — those live in the Workflows library page.
 * Instance mode: configuration display + placeholder canvas.
 *
 * Refresh fix: `initializing` state starts true, set false after first useEffect run.
 *   Prevents "not found" flash during auth gate resolution on hard refresh.
 *
 * GRACE-REVIEW:
 *   Phase 4 — real Flow/Graph canvas (react-flow or similar).
 *   Phase 4 — live log streaming in bottom Logs tab.
 *   Phase 4 — agent chat in right panel.
 *   Phase 4 — real Run execution via POST /api/instances/:id/run.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router";
import {
  Cpu,
  ArrowLeft,
  AlertCircle,
  Layers,
  FileText,
  Zap,
  Wrench,
  Users,
  CircleDot,
  ChevronDown,
  ChevronUp,
  Terminal,
  ListChecks,
  MessageSquare,
  PenLine,
  PanelLeft,
  BarChart3,
  GitBranch,
  Info,
  ChevronRight,
  Tag,
  Calendar,
  Hash,
  Clock,
} from "lucide-react";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { CreateInstanceModal } from "../components/CreateInstanceModal";
import type { Blueprint, BlueprintStep } from "../blueprints/blueprintTypes";
import type { Instance, InstanceStepSnapshot } from "../instances/instanceTypes";
import { cn } from "@/lib/utils";

type StudioMode = "landing" | "blueprint" | "instance";
type CenterTab = "graph" | "flow";
type BottomTab = "logs" | "steps" | "skills" | "tools" | "outputs" | "meta" | "trace";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/60",
  ready: "text-sky-600 bg-sky-500/10",
  running: "text-emerald-600 bg-emerald-500/10",
  paused: "text-amber-600 bg-amber-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  failed: "text-destructive bg-destructive/10",
  cancelled: "text-muted-foreground bg-muted/40",
};

// ─── Left Panel ────────────────────────────────────────────────────────────────

function LeftPanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border/60">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {title}
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && <div className="px-3 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

function MetaLine({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string | number }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1.5 text-xs">
      {icon && <span className="text-muted-foreground/50 mt-0.5 shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function LeftPanel({ mode, blueprint, instance }: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
}) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card/20 overflow-y-auto">
      {mode === "blueprint" && blueprint && (
        <>
          <LeftPanelSection title="Blueprint">
            <MetaLine icon={<Hash size={10} />} label="ID" value={blueprint.id} />
            <MetaLine icon={<Info size={10} />} label="Type" value={blueprint.workflowType.replace("-", " ")} />
            <MetaLine icon={<GitBranch size={10} />} label="Version" value={blueprint.version} />
            <MetaLine icon={<Tag size={10} />} label="Category" value={blueprint.ui?.category} />
            <MetaLine icon={<ListChecks size={10} />} label="Steps" value={blueprint.steps.length} />
            <MetaLine icon={<Zap size={10} />} label="Skills" value={[...new Set(blueprint.steps.flatMap((s) => s.skills ?? []).map((s) => s.id))].length || undefined} />
            <MetaLine icon={<Wrench size={10} />} label="Tools" value={[...new Set(blueprint.steps.flatMap((s) => s.tools ?? []).map((t) => t.id))].length || undefined} />
            <MetaLine icon={<Calendar size={10} />} label="Updated" value={blueprint.updatedAt ? new Date(blueprint.updatedAt).toLocaleDateString() : undefined} />
          </LeftPanelSection>

          {(blueprint.agentConfig.primary || (blueprint.agentConfig.specialists?.length ?? 0) > 0) && (
            <LeftPanelSection title="Agents">
              {blueprint.agentConfig.primary && (
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <CircleDot size={9} className="text-[var(--grace-accent)]/60" />
                    <span className="font-medium truncate">{blueprint.agentConfig.primary.label}</span>
                  </div>
                  <span className="ml-3.5 text-[10px] text-muted-foreground/60">primary</span>
                </div>
              )}
              {blueprint.agentConfig.specialists?.map((sp) => (
                <div key={sp.label} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <CircleDot size={9} className="text-muted-foreground/40" />
                    <span className="font-medium truncate">{sp.label}</span>
                  </div>
                  <span className="ml-3.5 text-[10px] text-muted-foreground/60">specialist{!sp.required ? " · optional" : ""}</span>
                </div>
              ))}
            </LeftPanelSection>
          )}

          {blueprint.ui?.tags && blueprint.ui.tags.length > 0 && (
            <LeftPanelSection title="Tags">
              <div className="flex flex-wrap gap-1">
                {blueprint.ui.tags.map((t) => (
                  <span key={t} className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                ))}
              </div>
            </LeftPanelSection>
          )}

          {blueprint.description && (
            <LeftPanelSection title="Description">
              <p className="text-xs text-muted-foreground leading-relaxed">{blueprint.description}</p>
            </LeftPanelSection>
          )}
        </>
      )}

      {mode === "instance" && instance && (
        <>
          <LeftPanelSection title="Instance">
            <MetaLine icon={<Hash size={10} />} label="ID" value={instance.id.slice(0, 12) + "…"} />
            <MetaLine icon={<GitBranch size={10} />} label="Blueprint" value={instance.blueprintName} />
            <div className="flex items-start gap-1.5 text-xs">
              <span className="text-muted-foreground shrink-0">Status:</span>
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase", STATUS_COLORS[instance.status] ?? STATUS_COLORS.draft)}>
                {instance.status}
              </span>
            </div>
            <MetaLine icon={<Clock size={10} />} label="Created" value={new Date(instance.createdAt).toLocaleDateString()} />
            <MetaLine icon={<ListChecks size={10} />} label="Steps" value={instance.graphSnapshot.length} />
          </LeftPanelSection>

          {instance.agentAssignments.length > 0 && (
            <LeftPanelSection title="Agents">
              {instance.agentAssignments.map((a) => (
                <div key={a.role + a.label} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <CircleDot size={9} className="text-[var(--grace-accent)]/60" />
                    <span className="font-medium truncate">{a.agentName}</span>
                  </div>
                  <span className="ml-3.5 text-[10px] text-muted-foreground/60">{a.label} · {a.role}</span>
                </div>
              ))}
            </LeftPanelSection>
          )}

          {instance.configSnapshot.length > 0 && (
            <LeftPanelSection title="Configuration">
              {instance.configSnapshot.map((ans) => (
                <div key={ans.questionId} className="text-xs">
                  <div className="text-muted-foreground truncate">{ans.label}</div>
                  <div className="font-medium truncate">{String(ans.value)}</div>
                </div>
              ))}
            </LeftPanelSection>
          )}
        </>
      )}

      {mode === "landing" && (
        <div className="flex flex-col items-center justify-center flex-1 p-4 opacity-30">
          <PanelLeft size={20} className="text-muted-foreground mb-2" />
          <p className="text-[10px] text-muted-foreground text-center">Open a Blueprint or Instance</p>
        </div>
      )}
    </aside>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────

function StudioHeader({
  mode, blueprint, instance, leftOpen, onToggleLeft,
  centerTab, onCenterTab, onBack, onCreateInstance,
}: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
  leftOpen: boolean;
  onToggleLeft: () => void;
  centerTab: CenterTab;
  onCenterTab: (t: CenterTab) => void;
  onBack: () => void;
  onCreateInstance?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-border px-3 py-2 flex items-center gap-2 bg-card/60">
      <button type="button" onClick={onBack}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        title="Back">
        <ArrowLeft size={14} />
      </button>

      {mode !== "landing" && (
        <button type="button" onClick={onToggleLeft}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded transition-colors shrink-0",
            leftOpen
              ? "text-[var(--grace-accent)] bg-[var(--grace-accent-muted)]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          title={leftOpen ? "Hide panel" : "Show panel"}>
          <PanelLeft size={14} />
        </button>
      )}

      {/* Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        {mode === "blueprint" && <PenLine size={13} className="text-[var(--grace-accent)] shrink-0" />}
        {mode === "instance" && <Cpu size={13} className="text-[var(--grace-accent)] shrink-0" />}
        <span className="text-sm font-semibold truncate">
          {mode === "landing" && "Studio"}
          {mode === "blueprint" && (blueprint?.name ?? "Blueprint")}
          {mode === "instance" && (instance?.name ?? "Instance")}
        </span>
      </div>

      {/* Badge */}
      {mode === "blueprint" && (
        <span className="shrink-0 rounded border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--grace-accent)] uppercase tracking-wide">
          Blueprint
        </span>
      )}
      {mode === "instance" && instance && (
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", STATUS_COLORS[instance.status] ?? STATUS_COLORS.draft)}>
          {instance.status}
        </span>
      )}

      {/* Center tab switcher */}
      {mode !== "landing" && (
        <div className="flex items-center mx-auto border border-border rounded overflow-hidden text-xs">
          {(["graph", "flow"] as CenterTab[]).map((tab, i) => (
            <button key={tab} type="button" onClick={() => onCenterTab(tab)}
              className={cn(
                "px-3 py-1 capitalize transition-colors",
                centerTab === tab
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
                i > 0 && "border-l border-border"
              )}>
              {tab === "graph" ? "Graph" : "Flow"}
            </button>
          ))}
          <button type="button" disabled
            className="px-3 py-1 text-muted-foreground/30 border-l border-border cursor-not-allowed"
            title="Runtime coming in Phase 4">
            Runtime
          </button>
        </div>
      )}

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {mode === "blueprint" && (
          <button type="button" onClick={onCreateInstance}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90">
            <Layers size={12} />Create Instance
          </button>
        )}
        {mode === "instance" && (
          <button type="button" disabled title="Execution coming in Phase 4"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-40">
            Start Run
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Flow View ─────────────────────────────────────────────────────────────────

type FlowStep = {
  id: string;
  name: string;
  description?: string;
  agentRole?: string;
  skills?: { id: string; name: string }[];
  tools?: { id: string; name: string }[];
};

function FlowStepCard({ step, index, total }: { step: FlowStep; index: number; total: number }) {
  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)]/40">
        <div className="flex items-start gap-3">
          {/* Step number */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--grace-accent)]/60 text-xs font-bold text-[var(--grace-accent)]">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{step.name}</span>
              {step.agentRole && (
                <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground capitalize">{step.agentRole}</span>
              )}
            </div>
            {step.description && (
              <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
            )}
            {((step.skills && step.skills.length > 0) || (step.tools && step.tools.length > 0)) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {step.skills?.map((skill) => (
                  <span key={skill.id} className="flex items-center gap-1 rounded border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] text-[var(--grace-accent)]">
                    <Zap size={9} />{skill.name}
                  </span>
                ))}
                {step.tools?.map((tool) => (
                  <span key={tool.id} className="flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Wrench size={9} />{tool.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {index < total - 1 && (
        <div className="flex justify-start ml-6 py-0.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-px h-3 bg-[var(--grace-accent)]/30" />
            <ChevronDown size={10} className="text-[var(--grace-accent)]/40 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

function FlowView({ steps }: { steps: FlowStep[] }) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <ListChecks size={28} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground/50">No steps defined.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-0">
      {steps.map((step, i) => (
        <FlowStepCard key={step.id} step={step} index={i} total={steps.length} />
      ))}
    </div>
  );
}

// ─── Graph View ────────────────────────────────────────────────────────────────

function GraphView({ steps, mode }: { steps: FlowStep[]; mode: StudioMode }) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <GitBranch size={28} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground/50">No nodes to display.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 relative">
      <style>{`
        @keyframes grace-node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--grace-accent-muted); }
          50% { box-shadow: 0 0 0 4px var(--grace-accent-muted); }
        }
        .grace-node { animation: grace-node-pulse 3s ease-in-out infinite; }
        .grace-node:nth-child(3n+1) { animation-delay: 0s; }
        .grace-node:nth-child(3n+2) { animation-delay: 1s; }
        .grace-node:nth-child(3n+3) { animation-delay: 2s; }
      `}</style>

      <p className="mb-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {mode === "blueprint" ? "Blueprint" : "Instance"} Graph · Phase 3 Placeholder
      </p>

      <div className="flex flex-wrap gap-3 items-start">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className="grace-node flex flex-col items-center gap-1.5 rounded-xl border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)] p-3 w-36 cursor-default select-none hover:border-[var(--grace-accent)]/60 transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--grace-accent)]/20 text-[10px] font-bold text-[var(--grace-accent)]">
                {i + 1}
              </div>
              <CircleDot size={10} className="text-[var(--grace-accent)]/50" />
              <span className="text-center text-[11px] font-medium text-foreground leading-tight line-clamp-2">{step.name}</span>
              {step.agentRole && (
                <span className="text-[9px] text-muted-foreground/60 capitalize">{step.agentRole}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center gap-1">
                <div className="h-px w-5 bg-gradient-to-r from-[var(--grace-accent)]/40 to-[var(--grace-accent)]/20" />
                <ChevronRight size={10} className="text-[var(--grace-accent)]/40 -ml-1.5" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-[10px] text-muted-foreground/30 italic">
        Phase 4 — interactive graph canvas with react-flow or equivalent
      </div>
    </div>
  );
}

// ─── Landing Canvas (atmospheric) ─────────────────────────────────────────────

function LandingCanvas() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      <style>{`
        @keyframes grace-float {
          0%, 100% { opacity: 0.12; transform: translateY(0px); }
          50% { opacity: 0.22; transform: translateY(-4px); }
        }
        @keyframes grace-ping-dot {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .grace-ghost { animation: grace-float 4s ease-in-out infinite; }
        .grace-ghost:nth-child(2) { animation-delay: 1.3s; }
        .grace-ghost:nth-child(3) { animation-delay: 2.6s; }
        .grace-ping { animation: grace-ping-dot 2s ease-in-out infinite; }
        .grace-ping:nth-child(2) { animation-delay: 0.7s; }
        .grace-ping:nth-child(3) { animation-delay: 1.4s; }
      `}</style>

      {/* Ghost activity cards (background atmosphere) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="grace-ghost absolute top-12 left-8 w-48 h-16 rounded-lg border border-border/30 bg-card/20 p-3">
          <div className="h-2 w-20 rounded bg-muted/40 mb-1.5" />
          <div className="h-1.5 w-32 rounded bg-muted/30" />
          <div className="h-1.5 w-24 rounded bg-muted/20 mt-1" />
        </div>
        <div className="grace-ghost absolute top-12 right-12 w-44 h-14 rounded-lg border border-border/20 bg-card/15 p-3">
          <div className="h-2 w-16 rounded bg-muted/30 mb-1.5" />
          <div className="h-1.5 w-28 rounded bg-muted/25" />
        </div>
        <div className="grace-ghost absolute bottom-20 left-1/4 w-52 h-16 rounded-lg border border-[var(--grace-accent)]/10 bg-[var(--grace-accent-muted)]/20 p-3">
          <div className="h-2 w-24 rounded bg-[var(--grace-accent)]/20 mb-1.5" />
          <div className="h-1.5 w-36 rounded bg-muted/25" />
          <div className="h-1.5 w-20 rounded bg-muted/20 mt-1" />
        </div>

        {/* Status ping dots */}
        <div className="grace-ping absolute top-8 right-1/3 w-2 h-2 rounded-full bg-[var(--grace-accent)]/40" />
        <div className="grace-ping absolute bottom-32 right-16 w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
        <div className="grace-ping absolute top-1/2 left-16 w-1.5 h-1.5 rounded-full bg-[var(--grace-accent)]/30" />
      </div>

      {/* Center message */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center relative z-10">
        <div className="rounded-full border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] p-4">
          <Cpu size={28} className="text-[var(--grace-accent)]/60" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Studio is ready</p>
          <p className="mt-1.5 text-xs text-muted-foreground/50 max-w-xs leading-relaxed">
            Open a Blueprint from Workflows, or select an Instance to view and configure it.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/30">
          <span className="flex items-center gap-1"><CircleDot size={8} className="text-emerald-500/40" />System idle</span>
          <span>·</span>
          <span>No active run</span>
        </div>
      </div>
    </div>
  );
}

// ─── Center Canvas ─────────────────────────────────────────────────────────────

function CenterCanvas({ mode, blueprint, instance, centerTab }: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
  centerTab: CenterTab;
}) {
  if (mode === "landing") return <LandingCanvas />;

  const steps: FlowStep[] =
    mode === "blueprint" && blueprint
      ? (blueprint.steps as BlueprintStep[]).map((s) => ({
          id: s.id, name: s.name, description: s.description,
          agentRole: s.agentRole, skills: s.skills, tools: s.tools,
        }))
      : mode === "instance" && instance
      ? (instance.graphSnapshot as InstanceStepSnapshot[]).map((s) => ({
          id: s.id, name: s.name, description: s.description, agentRole: s.agentRole,
        }))
      : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Blueprint template banner */}
      {mode === "blueprint" && (
        <div className="shrink-0 flex items-center gap-2 bg-[var(--grace-accent-muted)]/60 border-b border-[var(--grace-accent)]/20 px-4 py-1.5">
          <PenLine size={11} className="text-[var(--grace-accent)]/70" />
          <span className="text-xs text-[var(--grace-accent)]">
            <span className="font-semibold">Blueprint template</span>
            <span className="ml-1.5 opacity-70">— read-only view. Use "Create Instance" to execute this workflow.</span>
          </span>
        </div>
      )}

      {centerTab === "flow" && <FlowView steps={steps} />}
      {centerTab === "graph" && <GraphView steps={steps} mode={mode} />}
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ mode }: { mode: StudioMode }) {
  const [message, setMessage] = useState("");

  return (
    <aside className="flex w-56 shrink-0 flex-col border-l border-border bg-card/20">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <MessageSquare size={12} className="text-muted-foreground/60" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat</p>
        {mode !== "landing" && (
          <span className="ml-auto text-[10px] text-muted-foreground/40">Phase 4</span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        {mode === "landing" ? (
          <p className="text-xs text-muted-foreground/30 text-center">No item open</p>
        ) : (
          <>
            <div className="w-full space-y-1.5 opacity-40 pointer-events-none select-none" aria-hidden>
              {/* Ghost messages for atmosphere */}
              <div className="ml-auto w-4/5 rounded-lg rounded-br-none bg-[var(--grace-accent-muted)] px-2.5 py-1.5">
                <div className="h-1.5 w-full rounded bg-[var(--grace-accent)]/20 mb-1" />
                <div className="h-1.5 w-3/4 rounded bg-[var(--grace-accent)]/15" />
              </div>
              <div className="w-4/5 rounded-lg rounded-bl-none bg-card border border-border px-2.5 py-1.5">
                <div className="h-1.5 w-full rounded bg-muted/40 mb-1" />
                <div className="h-1.5 w-2/3 rounded bg-muted/30" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/35 text-center leading-relaxed">
              Agent chat will be available during runs in Phase 4.
            </p>
          </>
        )}
      </div>

      {mode !== "landing" && (
        <div className="border-t border-border/60 p-2">
          <div className="flex items-center gap-2 rounded border border-border/60 bg-muted/20 px-3 py-1.5 opacity-50 cursor-not-allowed">
            <span className="flex-1 text-xs text-muted-foreground/40">Message agent…</span>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Bottom Panel ──────────────────────────────────────────────────────────────

function BottomPanel({ mode, blueprint, instance }: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
}) {
  const [activeTab, setActiveTab] = useState<BottomTab>("logs");
  const [open, setOpen] = useState(true);

  const bpSteps = blueprint?.steps ?? [];
  const instSteps = instance?.graphSnapshot ?? [];
  const steps = mode === "blueprint" ? bpSteps : mode === "instance" ? instSteps : [];

  const allSkills = mode === "blueprint"
    ? [...new Map(bpSteps.flatMap((s) => s.skills ?? []).map((s) => [s.id, s])).values()]
    : [];
  const allTools = mode === "blueprint"
    ? [...new Map(bpSteps.flatMap((s) => s.tools ?? []).map((t) => [t.id, t])).values()]
    : [];
  const outputs = mode === "blueprint" ? (blueprint?.outputs ?? []) : [];

  const TABS: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
    { id: "logs",    label: "Logs",    icon: <Terminal size={11} /> },
    { id: "steps",   label: "Steps",   icon: <ListChecks size={11} /> },
    { id: "skills",  label: "Skills",  icon: <Zap size={11} /> },
    { id: "tools",   label: "Tools",   icon: <Wrench size={11} /> },
    { id: "outputs", label: "Outputs", icon: <FileText size={11} /> },
    { id: "meta",    label: "Meta",    icon: <Info size={11} /> },
    { id: "trace",   label: "Trace",   icon: <BarChart3 size={11} /> },
  ];

  return (
    <div className={cn("shrink-0 border-t border-border bg-card/30 flex flex-col transition-all duration-200", open ? "h-44" : "h-8")}>
      <div className="flex items-center gap-0 border-b border-border/60 h-8 shrink-0 px-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} type="button"
            onClick={() => { setActiveTab(tab.id); if (!open) setOpen(true); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-b-2 whitespace-nowrap",
              activeTab === tab.id && open
                ? "border-[var(--grace-accent)] text-[var(--grace-accent)]"
                : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="ml-auto flex items-center justify-center w-7 h-7 shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={open ? "Collapse" : "Expand"}>
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {activeTab === "logs" && (
            <div className="font-mono space-y-0.5">
              <p className="text-xs text-muted-foreground/40">
                {mode === "landing" && "> Studio ready. Open a Blueprint or Instance to begin."}
                {mode === "blueprint" && `> Blueprint loaded — template mode. v${blueprint?.version ?? "?"} · ${steps.length} steps.`}
                {mode === "instance" && `> Instance loaded — status: ${instance?.status ?? "draft"}. Execution wiring coming in Phase 4.`}
              </p>
              {mode !== "landing" && (
                <p className="text-xs text-muted-foreground/25">
                  {">"} Runtime log stream will appear here during runs.
                </p>
              )}
            </div>
          )}

          {activeTab === "steps" && (
            <div className="flex flex-wrap gap-2">
              {steps.length === 0 && <p className="text-xs text-muted-foreground/40">No steps defined.</p>}
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <span className="font-bold text-[var(--grace-accent)]/60 text-[10px]">{idx + 1}</span>
                  <span>{step.name}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="flex flex-wrap gap-2">
              {allSkills.length === 0 && <p className="text-xs text-muted-foreground/40">No skills attached to this blueprint.</p>}
              {allSkills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] px-2.5 py-1 text-xs">
                  <Zap size={10} className="text-[var(--grace-accent)]/60" />{skill.name}
                </div>
              ))}
            </div>
          )}

          {activeTab === "tools" && (
            <div className="flex flex-wrap gap-2">
              {allTools.length === 0 && <p className="text-xs text-muted-foreground/40">No tools attached to this blueprint.</p>}
              {allTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <Wrench size={10} className="text-muted-foreground/60" />{tool.name}
                </div>
              ))}
            </div>
          )}

          {activeTab === "outputs" && (
            <div className="flex flex-wrap gap-2">
              {outputs.length === 0 && <p className="text-xs text-muted-foreground/40">No outputs defined.</p>}
              {outputs.map((out) => (
                <div key={out.id} className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <FileText size={10} className="text-muted-foreground/60" />
                  <span className="font-medium">{out.name}</span>
                  <span className="text-muted-foreground/60">{out.type}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "meta" && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-1">
              {mode === "blueprint" && blueprint && (
                <>
                  <MetaItem label="ID" value={blueprint.id} />
                  <MetaItem label="Version" value={blueprint.version} />
                  <MetaItem label="Type" value={blueprint.workflowType} />
                  <MetaItem label="Category" value={blueprint.ui?.category} />
                  <MetaItem label="Steps" value={String(blueprint.steps.length)} />
                  <MetaItem label="Tags" value={blueprint.ui?.tags?.join(", ")} />
                  <MetaItem label="Created" value={blueprint.createdAt ? new Date(blueprint.createdAt).toLocaleDateString() : undefined} />
                  <MetaItem label="Updated" value={blueprint.updatedAt ? new Date(blueprint.updatedAt).toLocaleDateString() : undefined} />
                </>
              )}
              {mode === "instance" && instance && (
                <>
                  <MetaItem label="ID" value={instance.id} />
                  <MetaItem label="Blueprint" value={instance.blueprintName} />
                  <MetaItem label="Status" value={instance.status} />
                  <MetaItem label="Steps" value={String(instance.graphSnapshot.length)} />
                  <MetaItem label="Created" value={new Date(instance.createdAt).toLocaleDateString()} />
                  <MetaItem label="Updated" value={new Date(instance.updatedAt).toLocaleDateString()} />
                  <MetaItem label="Config" value={`${instance.configSnapshot.length} answer(s)`} />
                  <MetaItem label="Agents" value={`${instance.agentAssignments.length} assigned`} />
                </>
              )}
              {mode === "landing" && (
                <p className="col-span-2 text-xs text-muted-foreground/40">No item loaded.</p>
              )}
            </div>
          )}

          {activeTab === "trace" && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground/40">Execution trace will appear here during and after runs.</p>
              {/* Phase 4: execution trace entries streamed from runtime */}
              <div className="flex flex-wrap gap-2 opacity-25 pointer-events-none" aria-hidden>
                {["Init", "Step 1", "Step 2", "Complete"].map((step) => (
                  <div key={step} className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span>{step}</span>
                    <span className="text-muted-foreground/40">—</span>
                    <span className="text-muted-foreground/40">Phase 4</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs py-0.5">
      <span className="text-muted-foreground/60 shrink-0 w-20">{label}</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export function GraceStudio() {
  const { blueprintId, instanceId } = useParams<{ blueprintId?: string; instanceId?: string }>();
  const navigate = useNavigate();

  // initializing = true prevents "not found" flash during auth-gate resolution on hard refresh
  const [initializing, setInitializing] = useState(true);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<CenterTab>("flow");

  const mode: StudioMode = blueprintId ? "blueprint" : instanceId ? "instance" : "landing";

  useEffect(() => {
    setInitializing(true);
    setNotFound(false);
    setBlueprint(null);
    setInstance(null);

    if (blueprintId) {
      const bp = blueprintService.getById(blueprintId);
      if (bp) setBlueprint(bp);
      else setNotFound(true);
    } else if (instanceId) {
      const inst = instanceService.getById(instanceId);
      if (inst) setInstance(inst);
      else setNotFound(true);
    }

    setInitializing(false);
  }, [blueprintId, instanceId]);

  function handleBack() {
    if (mode === "blueprint") navigate("/grace/library");
    else if (mode === "instance") navigate("/grace/instances");
    else navigate("/grace/home");
  }

  function handleInstanceCreated(newInstance: ReturnType<typeof instanceService.create>) {
    setCreateInstanceOpen(false);
    navigate(`/grace/studio/instance/${newInstance.id}`);
  }

  // Loading skeleton (prevents not-found flash on hard refresh)
  if (initializing && (blueprintId || instanceId)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Cpu size={24} className="text-muted-foreground/20" />
          <div className="h-2 w-32 rounded bg-muted/40" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle size={32} className="text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          {mode === "blueprint" ? "Blueprint not found." : "Instance not found."}
        </p>
        <button type="button" onClick={handleBack} className="text-xs text-[var(--grace-accent)] hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <StudioHeader
        mode={mode}
        blueprint={blueprint}
        instance={instance}
        leftOpen={leftOpen}
        onToggleLeft={() => setLeftOpen((o) => !o)}
        centerTab={centerTab}
        onCenterTab={setCenterTab}
        onBack={handleBack}
        onCreateInstance={() => setCreateInstanceOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {leftOpen && mode !== "landing" && (
          <LeftPanel mode={mode} blueprint={blueprint} instance={instance} />
        )}

        <CenterCanvas
          mode={mode}
          blueprint={blueprint}
          instance={instance}
          centerTab={centerTab}
        />

        <RightPanel mode={mode} />
      </div>

      <BottomPanel mode={mode} blueprint={blueprint} instance={instance} />

      {blueprint && (
        <CreateInstanceModal
          blueprint={blueprint}
          open={createInstanceOpen}
          onClose={() => setCreateInstanceOpen(false)}
          onCreated={handleInstanceCreated}
        />
      )}
    </div>
  );
}
