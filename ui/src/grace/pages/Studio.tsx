/**
 * Studio — Phase 4
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Header: back · name · badge · [Panel toggle] · [G|F|R] · CTA │
 *   ├───────────────┬──────────────────────────────────┬─────────────┤
 *   │  Left panel   │   Center canvas                  │  Right chat │
 *   │  (toggleable) │   Graph ← or → Flow ← or → Rt   │  panel      │
 *   │  ~210px       │   + StepInspector drawer (right) │  240px      │
 *   ├───────────────┴──────────────────────────────────┴─────────────┤
 *   │  Bottom console: Logs|Steps|Skills|Tools|Outputs|Meta|Trace    │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Blueprint mode: read-only. "Create Instance" is the only CTA.
 * Instance mode: configuration + interactive canvas.
 *
 * Phase 4 additions:
 *   - FlowView: horizontal interactive lane (FlowStepCard)
 *   - GraphView: real force-directed canvas (GraphCanvas)
 *   - StepInspector: right drawer inside canvas, reusable
 *   - Runtime tab: structured placeholder with status/timeline/log
 *   - Bottom console: improved structured tabs
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "@/lib/router";
import {
  Cpu, ArrowLeft, AlertCircle, Layers, FileText, Zap, Wrench,
  CircleDot, ChevronDown, ChevronUp, Terminal, ListChecks,
  MessageSquare, PenLine, PanelLeft, BarChart3, GitBranch,
  Info, ChevronRight, Tag, Calendar, Hash, Clock, PlayCircle,
  Activity, GripVertical,
} from "lucide-react";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { CreateInstanceModal } from "../components/CreateInstanceModal";
import type { Blueprint, BlueprintStep } from "../blueprints/blueprintTypes";
import type { Instance, InstanceStepSnapshot } from "../instances/instanceTypes";
import { cn } from "@/lib/utils";
import { FlowStepCard } from "../components/FlowStepCard";
import type { FlowStep } from "../components/FlowStepCard";
import { StepInspector } from "../components/StepInspector";
import { GraphCanvas } from "../components/GraphCanvas";
import type { StudioAgent } from "../components/GraphCanvas";

type StudioMode = "landing" | "blueprint" | "instance";
type CenterTab = "graph" | "flow" | "runtime";
type BottomTab = "logs" | "steps" | "skills" | "tools" | "outputs" | "meta" | "trace";

const STATUS_COLORS: Record<string, string> = {
  draft:     "text-muted-foreground bg-muted/60",
  ready:     "text-sky-600 bg-sky-500/10",
  running:   "text-emerald-600 bg-emerald-500/10",
  paused:    "text-amber-600 bg-amber-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  failed:    "text-destructive bg-destructive/10",
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
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
}) {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card overflow-y-auto">
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
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
  leftOpen: boolean; onToggleLeft: () => void;
  centerTab: CenterTab; onCenterTab: (t: CenterTab) => void;
  onBack: () => void; onCreateInstance?: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-border px-3 py-2 flex items-center gap-2 bg-card">
      <button type="button" onClick={onBack}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        title="Back">
        <ArrowLeft size={14} />
      </button>

      {mode !== "landing" && (
        <button type="button" onClick={onToggleLeft}
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded transition-colors shrink-0",
            leftOpen ? "text-[var(--grace-accent)] bg-[var(--grace-accent-muted)]"
                     : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          title={leftOpen ? "Hide panel" : "Show panel"}>
          <PanelLeft size={14} />
        </button>
      )}

      <div className="flex items-center gap-1.5 min-w-0">
        {mode === "blueprint" && <PenLine size={13} className="text-[var(--grace-accent)] shrink-0" />}
        {mode === "instance"  && <Cpu      size={13} className="text-[var(--grace-accent)] shrink-0" />}
        <span className="text-sm font-semibold truncate">
          {mode === "landing"   && "Studio"}
          {mode === "blueprint" && (blueprint?.name ?? "Blueprint")}
          {mode === "instance"  && (instance?.name  ?? "Instance")}
        </span>
      </div>

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
          {(["graph", "flow", "runtime"] as CenterTab[]).map((tab, i) => (
            <button key={tab} type="button" onClick={() => onCenterTab(tab)}
              className={cn(
                "px-3 py-1 capitalize transition-colors",
                centerTab === tab
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
                i > 0 && "border-l border-border"
              )}>
              {tab === "graph"   ? "Graph"   :
               tab === "flow"    ? "Flow"    :
               "Runtime"}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {mode === "blueprint" && (
          <button type="button" onClick={onCreateInstance}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90">
            <Layers size={12} />Create Instance
          </button>
        )}
        {mode === "instance" && (
          <button type="button" disabled title="Execution wiring coming post-Phase 4"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-40">
            <PlayCircle size={12} />Start Run
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Flow View (horizontal lane) ──────────────────────────────────────────────

// Agent diamond chip shown in the FlowView agent bar
function AgentChip({ agent }: { agent: StudioAgent }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-2.5 py-1 text-xs select-none",
        agent.linked
          ? "border border-[var(--grace-accent)]/60 bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
          : "border border-dashed border-muted-foreground/35 bg-muted/20 text-muted-foreground/60",
      )}
    >
      {/* diamond */}
      <span
        className="shrink-0"
        style={{
          display: "inline-block",
          width: 8, height: 8,
          transform: "rotate(45deg)",
          border: agent.linked
            ? "1.5px solid var(--grace-accent)"
            : "1.5px dashed rgba(150,130,180,0.5)",
          background: agent.linked
            ? "rgba(167,139,250,0.15)"
            : "transparent",
        }}
      />
      <span className="font-medium">{agent.label}</span>
      <span className={cn("text-[9px]", agent.linked ? "opacity-50" : "opacity-40")}>
        {agent.linked ? "linked" : "unlinked"}
      </span>
    </div>
  );
}

function FlowView({
  steps,
  agents,
  selectedStep,
  onInspect,
}: {
  steps: FlowStep[];
  agents: StudioAgent[];
  selectedStep: FlowStep | null;
  onInspect: (step: FlowStep) => void;
}) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <ListChecks size={28} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground/50">No steps defined.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Agent bar — fixed above the scrollable lane */}
      <div className="shrink-0 flex items-center gap-2.5 border-b border-border/40 px-5 py-2 bg-card/40">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/35 shrink-0">
          Agents
        </span>
        {agents.length === 0 ? (
          <span className="text-[10px] text-muted-foreground/30 italic">No agents configured</span>
        ) : (
          agents.map((agent) => <AgentChip key={agent.id} agent={agent} />)
        )}
      </div>

      {/* Horizontal step lane */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="flex items-start gap-0 px-6 py-8 min-h-full"
          style={{ width: "max-content", minWidth: "100%" }}
        >
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-0 shrink-0">
              <FlowStepCard
                step={step}
                index={i}
                focused={selectedStep?.id === step.id}
                onInspect={onInspect}
              />
              {i < steps.length - 1 && (
                <div className="flex items-center px-2 shrink-0">
                  <div className="h-px w-6 bg-gradient-to-r from-[var(--grace-accent)]/40 to-[var(--grace-accent)]/20" />
                  <ChevronRight size={12} className="text-[var(--grace-accent)]/40 -ml-1.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal scroll hint */}
      {steps.length > 3 && (
        <div className="shrink-0 flex items-center justify-center py-1.5 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground/25">scroll horizontally to see all steps</span>
        </div>
      )}
    </div>
  );
}

// ─── Runtime View ──────────────────────────────────────────────────────────────

function RuntimeView({ mode, instance }: { mode: StudioMode; instance?: Instance | null }) {
  const status = mode === "instance" && instance ? instance.status : "idle";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
      {/* Status bar */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          status === "running" ? "bg-emerald-500/15" : "bg-muted/40"
        )}>
          <Activity size={16} className={status === "running" ? "text-emerald-500" : "text-muted-foreground/40"} />
        </div>
        <div>
          <p className="text-sm font-medium">
            {status === "running" ? "Run in progress" : "No active run"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {status === "running"
              ? "Execution is live — logs are streaming."
              : "Start a run to see live execution here."}
          </p>
        </div>
        <div className="ml-auto">
          <span className={cn(
            "rounded px-2 py-1 text-[10px] font-medium uppercase",
            STATUS_COLORS[status] ?? STATUS_COLORS.draft
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Timeline placeholder */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
          Execution Timeline
        </p>
        <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2 opacity-40 pointer-events-none" aria-hidden>
          {["Initialise", "Step 1 — Planning", "Step 2 — Research", "Step 3 — Synthesis", "Finalise"].map((s, i) => (
            <div key={s} className="flex items-center gap-3 text-xs">
              <div className={cn("w-2 h-2 rounded-full shrink-0", i === 0 ? "bg-emerald-500/60" : "bg-muted-foreground/30")} />
              <span className="text-muted-foreground">{s}</span>
              <div className="flex-1 h-px bg-muted/40" />
              <span className="text-muted-foreground/50 text-[10px]">—</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/30">Wired to live runtime in execution phase</p>
      </div>

      {/* Log stream placeholder */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
          Log Stream
        </p>
        <div className="rounded-lg border border-border/50 bg-black/20 font-mono p-3 space-y-1 opacity-30 pointer-events-none" aria-hidden>
          {[
            "> [GRACE] Runtime initialised",
            "> [AGENT] Primary agent connected",
            "> [STEP 1] Starting: Planning",
            "> [TOOL] web_search called with query='…'",
            "> [STEP 2] Starting: Research",
          ].map((line) => (
            <p key={line} className="text-[10px] text-emerald-400/80">{line}</p>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/30">Live log streaming — execution phase</p>
      </div>
    </div>
  );
}

// ─── Landing Canvas ────────────────────────────────────────────────────────────

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
        <div className="grace-ping absolute top-8 right-1/3 w-2 h-2 rounded-full bg-[var(--grace-accent)]/40" />
        <div className="grace-ping absolute bottom-32 right-16 w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
        <div className="grace-ping absolute top-1/2 left-16 w-1.5 h-1.5 rounded-full bg-[var(--grace-accent)]/30" />
      </div>
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

function CenterCanvas({
  mode, blueprint, instance, centerTab, agents,
  selectedStep, onInspect, onInspectorClose,
}: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
  centerTab: CenterTab;
  agents: StudioAgent[];
  selectedStep: FlowStep | null;
  onInspect: (step: FlowStep) => void;
  onInspectorClose: () => void;
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
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      {/* Blueprint template banner */}
      {mode === "blueprint" && (
        <div className="shrink-0 flex items-center gap-2 bg-[var(--grace-accent-muted)]/60 border-b border-[var(--grace-accent)]/20 px-4 py-1.5">
          <PenLine size={11} className="text-[var(--grace-accent)]/70" />
          <span className="text-xs text-[var(--grace-accent)]">
            <span className="font-semibold">Blueprint template</span>
            <span className="ml-1.5 opacity-70">— read-only. Use "Create Instance" to execute this workflow.</span>
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main canvas area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {centerTab === "flow" && (
            <FlowView steps={steps} agents={agents} selectedStep={selectedStep} onInspect={onInspect} />
          )}
          {centerTab === "graph" && (
            <GraphCanvas steps={steps} agents={agents} onStepInspect={onInspect} />
          )}
          {centerTab === "runtime" && (
            <RuntimeView mode={mode} instance={instance} />
          )}
        </div>

        {/* Step Inspector drawer */}
        {selectedStep && (
          <StepInspector step={selectedStep} onClose={onInspectorClose} />
        )}
      </div>
    </div>
  );
}

// ─── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({
  mode,
  width,
  onStartResize,
}: {
  mode: StudioMode;
  width: number;
  onStartResize: (e: React.MouseEvent) => void;
}) {
  return (
    <aside
      className="relative flex shrink-0 flex-col border-l border-border bg-card"
      style={{ width }}
    >
      {/* Drag handle — left edge */}
      <div
        onMouseDown={onStartResize}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group flex items-center justify-center hover:bg-[var(--grace-accent)]/20 transition-colors"
        title="Drag to resize chat panel"
      >
        <GripVertical
          size={12}
          className="text-muted-foreground/20 group-hover:text-[var(--grace-accent)]/50 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 pl-4">
        <MessageSquare size={12} className="text-muted-foreground/60" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat</p>
        {mode !== "landing" && (
          <span className="ml-auto text-[10px] text-muted-foreground/40">Execution phase</span>
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
        {mode === "landing" ? (
          <p className="text-xs text-muted-foreground/30 text-center">No item open</p>
        ) : (
          <>
            <div className="w-full space-y-1.5 opacity-40 pointer-events-none select-none" aria-hidden>
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
              Agent chat will be available during runs.
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

function MetaItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs py-0.5">
      <span className="text-muted-foreground/60 shrink-0 w-20">{label}</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}

function BottomPanel({ mode, blueprint, instance }: {
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
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
    { id: "logs",    label: "Logs",    icon: <Terminal   size={11} /> },
    { id: "steps",   label: "Steps",   icon: <ListChecks size={11} /> },
    { id: "skills",  label: "Skills",  icon: <Zap        size={11} /> },
    { id: "tools",   label: "Tools",   icon: <Wrench     size={11} /> },
    { id: "outputs", label: "Outputs", icon: <FileText   size={11} /> },
    { id: "meta",    label: "Meta",    icon: <Info       size={11} /> },
    { id: "trace",   label: "Trace",   icon: <BarChart3  size={11} /> },
  ];

  return (
    <div className={cn("shrink-0 border-t border-border bg-card flex flex-col transition-all duration-200", open ? "h-44" : "h-8")}>
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
            <div className="font-mono space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                <span className="text-emerald-500/60">›</span>
                <span>
                  {mode === "landing"    && "Studio ready. Open a Blueprint or Instance to begin."}
                  {mode === "blueprint"  && `Blueprint loaded — template mode · v${blueprint?.version ?? "?"} · ${steps.length} step(s) defined.`}
                  {mode === "instance"   && `Instance loaded — status: ${instance?.status ?? "draft"} · ${steps.length} step(s).`}
                </span>
              </div>
              {mode !== "landing" && (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/30">
                    <span className="text-muted-foreground/20">›</span>
                    <span>Runtime log stream will appear here during active runs.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/20 mt-1">
                    <span className="text-muted-foreground/15">›</span>
                    <span>Graph | Flow | Runtime views available via header tabs.</span>
                  </div>
                </>
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
                  {step.agentRole && (
                    <span className="text-[9px] text-muted-foreground/50 capitalize ml-1">· {step.agentRole}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="flex flex-wrap gap-2">
              {allSkills.length === 0 && <p className="text-xs text-muted-foreground/40">No skills defined.</p>}
              {allSkills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)] px-2.5 py-1 text-xs">
                  <Zap size={10} className="text-[var(--grace-accent)]/60" />
                  {skill.name}
                  <span className="text-[9px] text-muted-foreground/40">· skill</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "tools" && (
            <div className="flex flex-wrap gap-2">
              {allTools.length === 0 && <p className="text-xs text-muted-foreground/40">No tools defined.</p>}
              {allTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <Wrench size={10} className="text-muted-foreground/60" />
                  {tool.name}
                  <span className="text-[9px] text-muted-foreground/40">· tool</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "outputs" && (
            <div className="space-y-1.5">
              {outputs.length === 0 && <p className="text-xs text-muted-foreground/40">No outputs defined.</p>}
              {outputs.map((out) => (
                <div key={out.id} className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs">
                  <FileText size={10} className="text-muted-foreground/60" />
                  <span className="font-medium">{out.name}</span>
                  <span className="rounded bg-muted/60 px-1 py-px text-[9px] text-muted-foreground">{out.type}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground/30">pending</span>
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                <span className="text-muted-foreground/30">›</span>
                <span>Execution trace entries will stream here during and after runs.</span>
              </div>
              <div className="flex flex-wrap gap-2 opacity-20 pointer-events-none" aria-hidden>
                {[
                  { label: "Init",      status: "ok" },
                  { label: "Step 1",    status: "ok" },
                  { label: "Tool call", status: "ok" },
                  { label: "Step 2",    status: "pending" },
                  { label: "Complete",  status: "pending" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                    <div className={cn("w-1.5 h-1.5 rounded-full", item.status === "ok" ? "bg-emerald-500/60" : "bg-muted-foreground/40")} />
                    <span>{item.label}</span>
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

// ─── Root ──────────────────────────────────────────────────────────────────────

const CHAT_MIN = 160;
const CHAT_MAX = 520;
const CHAT_DEFAULT = 224;

export function GraceStudio() {
  const { blueprintId, instanceId } = useParams<{ blueprintId?: string; instanceId?: string }>();
  const navigate = useNavigate();

  const [initializing, setInitializing] = useState(true);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [centerTab, setCenterTab] = useState<CenterTab>("flow");
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT);

  // Step inspector state — shared across Flow and Graph
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);

  const mode: StudioMode = blueprintId ? "blueprint" : instanceId ? "instance" : "landing";

  // Close inspector when tab changes to runtime
  function handleCenterTab(tab: CenterTab) {
    setCenterTab(tab);
    if (tab === "runtime") setSelectedStep(null);
  }

  // Drag-to-resize chat panel
  const handleStartChatResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    function onMove(ev: MouseEvent) {
      // dragging left = startX - ev.clientX > 0 = growing
      const delta = startX - ev.clientX;
      setChatWidth(Math.max(CHAT_MIN, Math.min(CHAT_MAX, startWidth + delta)));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [chatWidth]);

  // Compute studio agents from blueprint or instance
  const studioAgents: StudioAgent[] = (() => {
    if (mode === "blueprint" && blueprint) {
      const agents: StudioAgent[] = [];
      if (blueprint.agentConfig.primary) {
        agents.push({
          id: "primary",
          label: blueprint.agentConfig.primary.label,
          role: blueprint.agentConfig.primary.role,
          linked: false, // blueprint templates never have real adapters linked
        });
      }
      blueprint.agentConfig.specialists?.forEach((sp, i) => {
        agents.push({
          id: `specialist-${i}`,
          label: sp.label,
          role: sp.role,
          linked: false,
        });
      });
      return agents;
    }
    if (mode === "instance" && instance) {
      // Build from agentConfig via blueprint snapshot — use agentAssignments for linked status
      const assignedRoles = new Set(instance.agentAssignments.map((a) => a.role));
      return instance.agentAssignments.map((a) => ({
        id: a.agentId || `${a.role}-${a.label}`,
        label: a.agentName || a.label,
        role: a.role,
        linked: assignedRoles.has(a.role) && !!a.agentId,
      }));
    }
    return [];
  })();

  useEffect(() => {
    setInitializing(true);
    setNotFound(false);
    setBlueprint(null);
    setInstance(null);
    setSelectedStep(null);

    if (blueprintId) {
      const bp = blueprintService.getById(blueprintId);
      if (bp) setBlueprint(bp); else setNotFound(true);
    } else if (instanceId) {
      const inst = instanceService.getById(instanceId);
      if (inst) setInstance(inst); else setNotFound(true);
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
        mode={mode} blueprint={blueprint} instance={instance}
        leftOpen={leftOpen} onToggleLeft={() => setLeftOpen((o) => !o)}
        centerTab={centerTab} onCenterTab={handleCenterTab}
        onBack={handleBack} onCreateInstance={() => setCreateInstanceOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {leftOpen && mode !== "landing" && (
          <LeftPanel mode={mode} blueprint={blueprint} instance={instance} />
        )}

        <CenterCanvas
          mode={mode} blueprint={blueprint} instance={instance}
          centerTab={centerTab}
          agents={studioAgents}
          selectedStep={selectedStep}
          onInspect={(step) => setSelectedStep(step)}
          onInspectorClose={() => setSelectedStep(null)}
        />

        <RightPanel mode={mode} width={chatWidth} onStartResize={handleStartChatResize} />
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
