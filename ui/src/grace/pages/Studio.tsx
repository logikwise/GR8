/**
 * Studio — Phase 8
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────────────┐
 *   │  Header: back · name · badge · [Panel toggle] · [G|F|R] · CTA │
 *   ├───────────────┬──────────────────────────────────┬─────────────┤
 *   │  Left panel   │   Center canvas                  │  Right chat │
 *   │  (toggleable) │   Graph ← or → Flow ← or → Rt   │  panel      │
 *   │  ~210px       │   + StepInspector drawer (right) │  resizable  │
 *   ├───────────────┴──────────────────────────────────┴─────────────┤
 *   │  Bottom: Logs|Steps|Skills|Tools|Inputs|Outputs|Meta|Trace     │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Phase 8 additions:
 *   - startRun() calls POST /api/grace/run/dispatch (real OpenClaw execute)
 *   - Polling useEffect: polls /api/grace/run/:providerRunId/poll every 3s
 *   - Inputs tab: InputsPanel for drag/drop uploads, links, asset list
 *   - Chat unfurling: URLs in messages render as OutputCard previews
 *   - OutputCard: reusable artifact/output card (compact + full modes)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "@/lib/router";
import {
  Cpu, ArrowLeft, AlertCircle, Box, FileText, Zap, Wrench,
  CircleDot, ChevronDown, ChevronUp, Terminal, ListChecks,
  MessageSquare, PenLine, PanelLeft, BarChart3, GitBranch,
  Info, ChevronRight, Tag, Calendar, Hash, Clock, PlayCircle,
  Activity, GripVertical, Square, Send, Plug, WifiOff,
  CheckCircle2, Loader2, Trash2, AlertTriangle, Paperclip, Link2, ExternalLink, X,
  Workflow, ArrowRight,
} from "lucide-react";
import { CreateWorkflowModal } from "../components/CreateWorkflowModal";
import { InputsPanel } from "../components/InputsPanel";
import { OutputCard } from "../components/OutputCard";
import type { OutputCardData } from "../components/OutputCard";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { providerService } from "../providers/providerService";
import { runService } from "../providers/runService";
import { CreateInstanceModal } from "../components/CreateInstanceModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Blueprint, BlueprintStep } from "../blueprints/blueprintTypes";
import type { Instance, InstanceStepSnapshot } from "../instances/instanceTypes";
import type { RunRecord } from "../providers/providerTypes";
import { cn } from "@/lib/utils";
import { FlowStepCard } from "../components/FlowStepCard";
import type { FlowStep } from "../components/FlowStepCard";
import { StepInspector } from "../components/StepInspector";
import { FlowCanvas } from "../components/FlowCanvas";
import type { StepStatusMap } from "../components/FlowCanvas";
import { GraphCanvas } from "../components/GraphCanvas";
import type { StudioAgent } from "../components/GraphCanvas";
import { outputService } from "../outputs/outputService";
import { inputService } from "../inputs/inputService";

type StudioMode = "landing" | "blueprint" | "instance";
type CenterTab = "graph" | "flow" | "runtime";
type BottomTab = "logs" | "steps" | "skills" | "tools" | "inputs" | "outputs" | "meta" | "trace";

const STATUS_COLORS: Record<string, string> = {
  draft:     "text-muted-foreground bg-muted/60",
  ready:     "text-sky-600 bg-sky-500/10",
  running:   "text-emerald-600 bg-emerald-500/10",
  paused:    "text-amber-600 bg-amber-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  failed:    "text-destructive bg-destructive/10",
  cancelled: "text-muted-foreground bg-muted/40",
};

const STEP_STATUS_COLORS: Record<string, string> = {
  idle:         "text-muted-foreground/40 bg-muted/20",
  ready:        "text-sky-600 bg-sky-500/10",
  running:      "text-emerald-600 bg-emerald-500/10",
  waiting:      "text-amber-600 bg-amber-500/10",
  human_review: "text-purple-600 bg-purple-500/10",
  completed:    "text-blue-600 bg-blue-500/10",
  failed:       "text-destructive bg-destructive/10",
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

function LeftPanel({
  mode, blueprint, instance, onDeleteInstance,
}: {
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
  onDeleteInstance?: () => void;
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
          {onDeleteInstance && (
            <div className="mt-auto p-3 border-t border-border/40">
              <button
                type="button"
                onClick={onDeleteInstance}
                className="flex w-full items-center gap-2 rounded border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                <Trash2 size={11} />
                Delete Instance
              </button>
            </div>
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
  runRecord, onStartRun, onStopRun, runStarting,
  providerConnected,
}: {
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
  leftOpen: boolean; onToggleLeft: () => void;
  centerTab: CenterTab; onCenterTab: (t: CenterTab) => void;
  onBack: () => void; onCreateInstance?: () => void;
  runRecord: RunRecord | null;
  onStartRun?: () => void;
  onStopRun?: () => void;
  runStarting: boolean;
  providerConnected: boolean;
}) {
  const isRunning = runRecord?.status === "running";
  const displayStatus = runRecord ? runRecord.status : (instance?.status ?? "draft");

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
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", STATUS_COLORS[displayStatus] ?? STATUS_COLORS.draft)}>
          {displayStatus}
        </span>
      )}

      {/* Provider indicator (instance mode only) */}
      {mode === "instance" && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] shrink-0",
          providerConnected ? "text-emerald-500/70" : "text-muted-foreground/30",
        )} title={providerConnected ? "Provider configured" : "No provider configured — go to Connections"}>
          {providerConnected
            ? <Plug size={10} />
            : <WifiOff size={10} />}
          <span className="hidden sm:inline">
            {providerConnected
              ? providerService.getConfig()?.type ?? "provider"
              : "no provider"}
          </span>
        </div>
      )}

      {/* Center tab switcher */}
      {mode !== "landing" && (
        <div className="flex items-center mx-auto border border-border rounded overflow-hidden text-xs">
          {(mode === "blueprint" ? (["graph", "flow"] as CenterTab[]) : (["graph", "flow", "runtime"] as CenterTab[])).map((tab, i) => (
            <button key={tab} type="button" onClick={() => onCenterTab(tab)}
              className={cn(
                "px-3 py-1 capitalize transition-colors",
                centerTab === tab
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
                i > 0 && "border-l border-border"
              )}>
              {tab === "runtime"
                ? (isRunning ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Runtime
                    </span>
                  ) : "Runtime")
                : tab === "graph" ? "Graph" : "Flow"}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {mode === "blueprint" && (
          <button type="button" onClick={onCreateInstance}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90">
            <Box size={12} />Create Instance
          </button>
        )}

        {mode === "instance" && isRunning && (
          <button type="button" onClick={onStopRun}
            className="flex items-center gap-1.5 rounded border border-destructive/60 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">
            <Square size={11} />Stop
          </button>
        )}

        {mode === "instance" && !isRunning && (
          <button type="button"
            onClick={onStartRun}
            disabled={runStarting}
            className={cn(
              "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-all",
              providerConnected
                ? "border-[var(--grace-accent)] bg-[var(--grace-accent)] text-white hover:opacity-90"
                : "border-border text-muted-foreground/50 cursor-not-allowed opacity-50",
            )}
            title={providerConnected ? "Start a run for this instance" : "Configure a provider in Connections first"}>
            {runStarting
              ? <Loader2 size={12} className="animate-spin" />
              : <PlayCircle size={12} />}
            {runStarting ? "Starting…" : "Start Run"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Flow View (horizontal lane) ──────────────────────────────────────────────

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
  steps, agents, selectedStep, onInspect, runRecord,
}: {
  steps: FlowStep[];
  agents: StudioAgent[];
  selectedStep: FlowStep | null;
  onInspect: (step: FlowStep) => void;
  runRecord: RunRecord | null;
}) {
  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <ListChecks size={28} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground/50">No steps defined.</p>
      </div>
    );
  }

  function getStepStatus(stepId: string) {
    if (!runRecord) return undefined;
    return runRecord.steps.find((s) => s.stepId === stepId)?.status;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Agent strip — only shown when agents are configured */}
      {agents.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border/40 px-5 py-1.5 bg-card/30">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/30 shrink-0">
            Agents
          </span>
          {agents.map((agent) => <AgentChip key={agent.id} agent={agent} />)}
        </div>
      )}

      {/* Flow canvas — centered when content fits, scrollable when it overflows */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-8">
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-0 shrink-0">
                <FlowStepCard
                  step={step}
                  index={i}
                  focused={selectedStep?.id === step.id}
                  onInspect={onInspect}
                  stepStatus={getStepStatus(step.id)}
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
      </div>
    </div>
  );
}

// ─── Runtime View ──────────────────────────────────────────────────────────────

function RuntimeView({
  mode, instance, runRecord,
}: {
  mode: StudioMode; instance?: Instance | null; runRecord: RunRecord | null;
}) {
  const isRunning = runRecord?.status === "running";
  const status = runRecord?.status ?? (mode === "instance" && instance ? instance.status : "idle");
  const providerConfig = providerService.getConfig();
  const events = runRecord?.events ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
      {/* Status bar */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isRunning ? "bg-emerald-500/15" : "bg-muted/40"
        )}>
          <Activity size={16} className={isRunning ? "text-emerald-500 animate-pulse" : "text-muted-foreground/40"} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isRunning ? "Run in progress" : runRecord ? `Run ${runRecord.status}` : "No active run"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
            {runRecord
              ? `Run ID: ${runRecord.id} · started ${new Date(runRecord.startedAt).toLocaleTimeString()}`
              : "Start a run to see live execution here."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "rounded px-2 py-1 text-[10px] font-medium uppercase",
            STATUS_COLORS[status] ?? STATUS_COLORS.draft
          )}>
            {status}
          </span>
        </div>
      </div>

      {/* Provider info */}
      {(runRecord || providerConfig) && (
        <div className="rounded-lg border border-border/50 bg-card p-3 flex items-center gap-3">
          <Plug size={13} className="text-muted-foreground/40 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted-foreground/60">Provider: </span>
            <span className="text-xs font-medium">
              {runRecord?.providerType ?? providerConfig?.type ?? "—"}
            </span>
            {runRecord?.providerRunId && (
              <span className="ml-2 text-[10px] text-muted-foreground/40 font-mono">
                gateway ID: {runRecord.providerRunId}
              </span>
            )}
          </div>
          {!providerConfig && (
            <span className="text-[10px] text-amber-500/70 shrink-0">not configured</span>
          )}
        </div>
      )}

      {/* Step timeline */}
      {runRecord && runRecord.steps.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
            Step Timeline
          </p>
          <div className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
            {runRecord.steps.map((step) => (
              <div key={step.stepId} className="flex items-center gap-3 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  step.status === "completed" ? "bg-emerald-500" :
                  step.status === "running"   ? "bg-[var(--grace-accent)] animate-pulse" :
                  step.status === "failed"    ? "bg-destructive" :
                  "bg-muted-foreground/30"
                )} />
                <span className={cn(
                  "truncate",
                  step.status === "running" ? "text-[var(--grace-accent)] font-medium" : "text-muted-foreground"
                )}>{step.stepName}</span>
                <div className="flex-1 h-px bg-muted/30" />
                <span className={cn(
                  "text-[9px] rounded px-1 py-px uppercase font-medium",
                  STEP_STATUS_COLORS[step.status] ?? STEP_STATUS_COLORS.idle
                )}>{step.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline placeholder if no run */}
      {!runRecord && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
            Execution Timeline
          </p>
          <div className="rounded-lg border border-border/50 bg-card/40 p-4 space-y-2 opacity-30 pointer-events-none" aria-hidden>
            {["Initialise", "Step 1 — Planning", "Step 2 — Research", "Step 3 — Synthesis", "Finalise"].map((s, i) => (
              <div key={s} className="flex items-center gap-3 text-xs">
                <div className={cn("w-2 h-2 rounded-full shrink-0", i === 0 ? "bg-emerald-500/60" : "bg-muted-foreground/30")} />
                <span className="text-muted-foreground">{s}</span>
                <div className="flex-1 h-px bg-muted/40" />
                <span className="text-muted-foreground/50 text-[10px]">—</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/30">Start a run to see the live timeline.</p>
        </div>
      )}

      {/* Log stream */}
      {runRecord && events.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
            Event Log
          </p>
          <div className="rounded-lg border border-border/50 bg-black/20 font-mono p-3 space-y-1 max-h-48 overflow-y-auto">
            {events.map((ev) => (
              <p key={ev.id} className={cn(
                "text-[10px]",
                ev.level === "error" ? "text-destructive/80" :
                ev.level === "warn"  ? "text-amber-400/80" :
                ev.level === "debug" ? "text-muted-foreground/40" :
                "text-emerald-400/80"
              )}>
                &gt; [{ev.tag}] {ev.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {!runRecord && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 mb-2">
            Log Stream
          </p>
          <div className="rounded-lg border border-border/50 bg-black/20 font-mono p-3 space-y-1 opacity-30 pointer-events-none" aria-hidden>
            {["> [GRACE] Runtime initialised", "> [AGENT] Primary agent connected", "> [STEP 1] Starting: Planning", "> [TOOL] web_search called", "> [STEP 2] Starting: Research"].map((line) => (
              <p key={line} className="text-[10px] text-emerald-400/80">{line}</p>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground/30">Start a run to see live log streaming.</p>
        </div>
      )}
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
          <div className="h-1.5 w-36 rounded bg-[var(--grace-accent)]/10" />
        </div>
        <div className="grace-ping absolute top-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-[var(--grace-accent)]/40" />
        <div className="grace-ping absolute top-2/3 right-1/4 w-1 h-1 rounded-full bg-[var(--grace-accent)]/30" />
        <div className="grace-ping absolute top-1/2 left-2/3 w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none" aria-hidden>
        <Cpu size={28} className="text-muted-foreground/15" />
        <div className="text-center">
          <p className="text-xs font-medium text-muted-foreground/20">Studio</p>
          <p className="text-[10px] text-muted-foreground/12 mt-0.5">Open a Blueprint or Instance to begin</p>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Info Card ─────────────────────────────────────────────────────────

function WorkflowInfoCard({
  mode, name, description, steps, blueprint, agents, onClose, onOpenTab,
}: {
  mode: StudioMode;
  name: string;
  description?: string;
  steps: FlowStep[];
  blueprint?: Blueprint | null;
  agents: StudioAgent[];
  onClose: () => void;
  onOpenTab?: (tab: BottomTab) => void;
}) {
  const allSkills = [...new Map(
    steps.flatMap((s) => s.skills ?? []).map((sk) => [sk.id, sk])
  ).values()];
  const allTools = [...new Map(
    steps.flatMap((s) => s.tools ?? []).map((t) => [t.id, t])
  ).values()];

  // Derive agents referenced by steps via agentRole matching
  const usedRoles = [...new Set(steps.map((s) => s.agentRole).filter(Boolean) as string[])];
  const usedAgents = usedRoles
    .map((role) => agents.find(
      (a) => a.role === role || a.label.toLowerCase() === role.toLowerCase(),
    ) ?? { id: role, label: role, role, linked: false });

  const categoryLabel = mode === "blueprint" ? "BLUEPRINT" : "WORKFLOW";
  const version = blueprint?.version;
  const [expanded, setExpanded] = useState(false);

  const MAX_PILLS = 4;

  function Pill({
    label, onClick,
  }: { label: string; onClick?: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors leading-tight",
          onClick
            ? "border-[var(--grace-accent)]/30 bg-[var(--grace-accent)]/10 text-[var(--grace-accent)] hover:bg-[var(--grace-accent)]/20 cursor-pointer"
            : "border-border/60 bg-card text-muted-foreground/70 cursor-default"
        )}
      >
        {label}
      </button>
    );
  }

  function Section({
    label, items, tab,
  }: { label: string; items: string[]; tab?: BottomTab }) {
    if (items.length === 0) return null;
    const shown = items.slice(0, MAX_PILLS);
    const extra = items.length - shown.length;
    return (
      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/40 font-medium">
          {label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {shown.map((item) => (
            <Pill key={item} label={item} onClick={tab ? () => onOpenTab?.(tab) : undefined} />
          ))}
          {extra > 0 && (
            <Pill
              label={`+${extra} more`}
              onClick={tab ? () => onOpenTab?.(tab) : undefined}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl w-72 overflow-hidden">
      {/* ── Collapsed header (always visible) ── */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-1.5">
          <span className="text-[9px] tracking-[0.2em] uppercase text-[var(--grace-accent)] font-semibold">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1 -mt-0.5 -mr-0.5">
            {/* Expand / collapse toggle */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground/40 hover:text-muted-foreground transition-colors p-0.5"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button type="button" onClick={onClose}
              className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Name */}
        <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground mb-1">
          {name}
        </h2>

        {/* Description — always visible */}
        {description ? (
          <p className={cn(
            "text-[11px] text-muted-foreground/70 leading-relaxed",
            expanded ? "line-clamp-none" : "line-clamp-2",
          )}>
            {description}
          </p>
        ) : null}
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3">
          {/* Agent + skill + tool sections */}
          <Section
            label="Agents"
            items={usedAgents.map((a) => a.label)}
            tab={undefined}
          />
          <Section
            label="Skills"
            items={allSkills.map((s) => s.name)}
            tab="skills"
          />
          <Section
            label="Tools"
            items={allTools.map((t) => t.name)}
            tab="tools"
          />

          {/* Footer row */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <ListChecks size={9} /> {steps.length} step{steps.length !== 1 ? "s" : ""}
              </span>
              {version && (
                <span className="flex items-center gap-1">
                  <GitBranch size={9} /> v{version}
                </span>
              )}
            </div>
            <button type="button"
              onClick={() => onOpenTab?.("steps")}
              className="flex items-center gap-1 text-[10px] text-[var(--grace-accent)]/70 hover:text-[var(--grace-accent)] transition-colors font-medium">
              View steps <ChevronRight size={9} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Center Canvas ─────────────────────────────────────────────────────────────

function CenterCanvas({
  mode, blueprint, instance, centerTab, agents,
  selectedStep, onInspect, onInspectorClose, runRecord,
  onOpenBottomTab,
}: {
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
  centerTab: CenterTab; agents: StudioAgent[];
  selectedStep: FlowStep | null;
  onInspect: (step: FlowStep) => void;
  onInspectorClose: () => void;
  runRecord: RunRecord | null;
  onOpenBottomTab?: (tab: BottomTab) => void;
}) {
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);

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

  // Step status map for live node coloring in FlowCanvas
  const stepStatuses: StepStatusMap = {};
  for (const sr of runRecord?.steps ?? []) {
    stepStatuses[sr.stepId] = sr.status;
  }

  const infoName = mode === "blueprint" ? blueprint?.name : instance?.name;
  const infoDesc = mode === "blueprint" ? blueprint?.description : instance?.blueprintName;
  const infoSteps = steps.length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      {mode === "blueprint" && (
        <div className="shrink-0 flex items-center gap-2 bg-[var(--grace-accent-muted)]/60 border-b border-[var(--grace-accent)]/20 px-4 py-1.5">
          <PenLine size={11} className="text-[var(--grace-accent)]/70" />
          <span className="text-xs text-[var(--grace-accent)]">
            <span className="font-semibold">Blueprint template</span>
            <span className="ml-1.5 opacity-70">— read-only. Use "Create Instance" to execute this workflow.</span>
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-1 flex-col overflow-hidden">
          {centerTab === "flow" && (
            <div className="flex-1 overflow-hidden relative" style={{ height: "100%" }}>
              <FlowCanvas
                steps={steps}
                agents={agents}
                stepStatuses={stepStatuses}
                onStepInspect={onInspect}
              />
            </div>
          )}
          {centerTab === "graph" && (
            <GraphCanvas steps={steps} agents={agents} onStepInspect={onInspect} />
          )}
          {centerTab === "runtime" && (
            <RuntimeView mode={mode} instance={instance} runRecord={runRecord} />
          )}
        </div>

        {/* Floating workflow info panel (graph + flow tabs) */}
        {(centerTab === "graph" || centerTab === "flow") && infoName && (
          <div className="absolute top-3 left-3 z-20">
            {infoPanelOpen ? (
              <WorkflowInfoCard
                mode={mode}
                name={infoName}
                description={infoDesc}
                steps={steps}
                blueprint={blueprint}
                agents={agents}
                onClose={() => setInfoPanelOpen(false)}
                onOpenTab={onOpenBottomTab}
              />
            ) : (
              <button type="button" onClick={() => setInfoPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card/80 backdrop-blur px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-[var(--grace-accent)]/40 transition-colors shadow-md">
                <Info size={10} />
                <span className="font-medium truncate max-w-32">{infoName}</span>
                <ChevronDown size={9} className="text-muted-foreground/50" />
              </button>
            )}
          </div>
        )}

        {selectedStep && (
          <StepInspector
            step={selectedStep}
            stepIndex={steps.findIndex((s) => s.id === selectedStep.id)}
            onClose={onInspectorClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── Right Panel (Chat) ────────────────────────────────────────────────────────

function RightPanel({
  mode, width, onStartResize, runRecord, onSendMessage,
}: {
  mode: StudioMode;
  width: number;
  onStartResize: (e: React.MouseEvent) => void;
  runRecord: RunRecord | null;
  onSendMessage?: (msg: string) => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isRunning = runRecord?.status === "running";
  const messages = runRecord?.chatMessages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || !onSendMessage) return;
    onSendMessage(trimmed);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <aside
      className="relative flex shrink-0 flex-col border-l border-border bg-card"
      style={{ width }}
    >
      <div
        onMouseDown={onStartResize}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group flex items-center justify-center hover:bg-[var(--grace-accent)]/20 transition-colors"
        title="Drag to resize chat panel"
      >
        <GripVertical size={12} className="text-muted-foreground/20 group-hover:text-[var(--grace-accent)]/50 transition-colors" />
      </div>

      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 pl-4 shrink-0">
        <MessageSquare size={12} className="text-muted-foreground/60" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat</p>
        {isRunning && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-500/70">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            live
          </span>
        )}
        {!isRunning && mode !== "landing" && runRecord && (
          <span className="ml-auto text-[10px] text-muted-foreground/40 capitalize">{runRecord.status}</span>
        )}
        {!isRunning && mode !== "landing" && !runRecord && (
          <span className="ml-auto text-[10px] text-muted-foreground/30">no run</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {mode === "landing" && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-muted-foreground/30 text-center">No item open</p>
          </div>
        )}

        {mode !== "landing" && messages.length === 0 && !isRunning && (
          <div className="flex flex-col h-full items-center justify-center gap-2">
            <div className="w-full space-y-1.5 opacity-30 pointer-events-none select-none" aria-hidden>
              <div className="ml-auto w-4/5 rounded-lg rounded-br-none bg-[var(--grace-accent-muted)] px-2.5 py-1.5">
                <div className="h-1.5 w-full rounded bg-[var(--grace-accent)]/20 mb-1" />
                <div className="h-1.5 w-3/4 rounded bg-[var(--grace-accent)]/15" />
              </div>
              <div className="w-4/5 rounded-lg rounded-bl-none bg-card border border-border px-2.5 py-1.5">
                <div className="h-1.5 w-full rounded bg-muted/40 mb-1" />
                <div className="h-1.5 w-2/3 rounded bg-muted/30" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/35 text-center leading-relaxed px-2">
              Start a run to activate agent chat.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const urlMatches = msg.content.match(/https?:\/\/[^\s)>]+/g) ?? [];
          const unfurlCards: OutputCardData[] = urlMatches.map((url) => ({
            title: (() => { try { return new URL(url).hostname; } catch { return url.slice(0, 40); } })(),
            type: "link" as const,
            source: msg.role === "agent" ? "agent" : "user",
            reference: url,
            producedAt: msg.timestamp,
          }));

          return (
            <div key={msg.id} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
              {msg.role === "system" ? (
                <div className="w-full rounded border border-border/40 bg-muted/20 px-2.5 py-1.5">
                  <p className="text-[10px] text-muted-foreground/60 leading-snug">{msg.content}</p>
                </div>
              ) : msg.role === "user" ? (
                <div className="max-w-[90%] rounded-lg rounded-br-none bg-[var(--grace-accent-muted)] border border-[var(--grace-accent)]/20 px-2.5 py-1.5">
                  <p className="text-xs text-foreground leading-snug">{msg.content}</p>
                  <p className="text-[9px] text-muted-foreground/40 mt-0.5 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ) : (
                <div className="max-w-[90%] rounded-lg rounded-bl-none bg-card border border-border/60 px-2.5 py-1.5">
                  <p className="text-xs text-foreground leading-snug">{msg.content}</p>
                  <p className="text-[9px] text-muted-foreground/40 mt-0.5">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              )}
              {unfurlCards.length > 0 && msg.role !== "system" && (
                <div className="w-full max-w-[90%] space-y-1">
                  {unfurlCards.map((card, i) => (
                    <OutputCard key={i} output={card} compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {mode !== "landing" && (
        <div className="border-t border-border/60 p-2 shrink-0">
          {isRunning ? (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Message agent…"
                className="flex-1 resize-none rounded border border-border/60 bg-muted/20 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
              >
                <Send size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded border border-border/40 bg-muted/10 px-3 py-1.5 opacity-40 cursor-not-allowed">
              <span className="flex-1 text-xs text-muted-foreground/50">Start a run to send messages</span>
            </div>
          )}
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

function BottomPanel({
  mode, blueprint, instance, runRecord,
  activeTab, open, onSetActiveTab, onSetOpen,
}: {
  mode: StudioMode; blueprint?: Blueprint | null; instance?: Instance | null;
  runRecord: RunRecord | null;
  activeTab: BottomTab; open: boolean;
  onSetActiveTab: (t: BottomTab) => void;
  onSetOpen: (v: boolean) => void;
}) {

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

  const ALL_TABS: { id: BottomTab; label: string; icon: React.ReactNode; instanceOnly?: boolean }[] = [
    { id: "logs",    label: "Logs",    icon: <Terminal   size={11} />, instanceOnly: true  },
    { id: "steps",   label: "Steps",   icon: <ListChecks size={11} /> },
    { id: "skills",  label: "Skills",  icon: <Zap        size={11} /> },
    { id: "tools",   label: "Tools",   icon: <Wrench     size={11} /> },
    { id: "inputs",  label: "Inputs",  icon: <Paperclip  size={11} />, instanceOnly: true  },
    { id: "outputs", label: "Outputs", icon: <FileText   size={11} />, instanceOnly: true  },
    { id: "meta",    label: "Meta",    icon: <Info       size={11} /> },
    { id: "trace",   label: "Trace",   icon: <BarChart3  size={11} />, instanceOnly: true  },
  ];

  const TABS = ALL_TABS.filter((t) => !(mode === "blueprint" && t.instanceOnly));

  // Reset active tab if it's no longer visible
  useEffect(() => {
    if (!TABS.find((t) => t.id === activeTab)) {
      onSetActiveTab(TABS[0]?.id ?? "steps");
    }
  }, [mode]);

  const runEvents = runRecord?.events ?? [];
  const runSteps = runRecord?.steps ?? [];

  return (
    <div className={cn("shrink-0 border-t border-border bg-card flex flex-col transition-all duration-200", open ? "h-44" : "h-8")}>
      <div className="flex items-center gap-0 border-b border-border/60 h-8 shrink-0 px-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.id} type="button"
            onClick={() => { onSetActiveTab(tab.id); if (!open) onSetOpen(true); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-b-2 whitespace-nowrap",
              activeTab === tab.id && open
                ? "border-[var(--grace-accent)] text-[var(--grace-accent)]"
                : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
            )}>
            {tab.icon}{tab.label}
            {tab.id === "logs" && runEvents.length > 0 && (
              <span className="ml-1 rounded-full bg-emerald-500/20 px-1 py-px text-[9px] text-emerald-600 font-semibold">
                {runEvents.length}
              </span>
            )}
          </button>
        ))}
        <button type="button" onClick={() => onSetOpen(!open)}
          className="ml-auto flex items-center justify-center w-7 h-7 shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={open ? "Collapse" : "Expand"}>
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {activeTab === "logs" && (
            <div className="font-mono space-y-1">
              {runEvents.length > 0 ? (
                runEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 text-[10px]">
                    <span className={cn(
                      "shrink-0",
                      ev.level === "error" ? "text-destructive/60" :
                      ev.level === "warn"  ? "text-amber-400/60" :
                      ev.level === "debug" ? "text-muted-foreground/30" :
                      "text-emerald-500/60"
                    )}>›</span>
                    <span className="text-muted-foreground/40 shrink-0">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    <span className="text-muted-foreground/50 shrink-0">[{ev.tag}]</span>
                    <span className={cn(
                      ev.level === "error" ? "text-destructive/80" :
                      ev.level === "warn"  ? "text-amber-400/80" :
                      "text-muted-foreground"
                    )}>{ev.message}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <span className="text-emerald-500/60">›</span>
                    <span>
                      {mode === "landing"    && "Studio ready. Open a Blueprint or Instance to begin."}
                      {mode === "blueprint"  && `Blueprint loaded — template mode · v${blueprint?.version ?? "?"} · ${steps.length} step(s) defined.`}
                      {mode === "instance"   && `Instance loaded — status: ${instance?.status ?? "draft"} · ${steps.length} step(s). Start a run to see logs.`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/25 mt-1">
                    <span className="text-muted-foreground/15">›</span>
                    <span>Run log stream will appear here during active runs.</span>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "steps" && (
            <div className="flex flex-wrap gap-2">
              {steps.length === 0 && <p className="text-xs text-muted-foreground/40">No steps defined.</p>}
              {steps.map((step, idx) => {
                const runStep = runSteps.find((rs) => rs.stepId === step.id);
                return (
                  <div key={step.id} className={cn(
                    "flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs",
                    runStep?.status === "running" ? "border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)]" : "border-border/60 bg-muted/30"
                  )}>
                    <span className="font-bold text-[var(--grace-accent)]/60 text-[10px]">{idx + 1}</span>
                    <span>{step.name}</span>
                    {runStep && (
                      <span className={cn("text-[9px] rounded px-1 py-px uppercase", STEP_STATUS_COLORS[runStep.status] ?? "")}>
                        {runStep.status}
                      </span>
                    )}
                  </div>
                );
              })}
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

          {activeTab === "inputs" && instance && (
            <InputsPanel instanceId={instance.id} runId={runRecord?.id} />
          )}

          {activeTab === "inputs" && !instance && (
            <p className="text-xs text-muted-foreground/40">Open an instance to manage inputs.</p>
          )}

          {activeTab === "outputs" && (
            <div className="space-y-1.5">
              {outputs.length === 0 && runRecord && (
                <p className="text-xs text-muted-foreground/40">No outputs produced yet.</p>
              )}
              {outputs.length === 0 && !runRecord && (
                <p className="text-xs text-muted-foreground/40">No outputs defined.</p>
              )}
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
                  {runRecord && <MetaItem label="Run ID" value={runRecord.id} />}
                  {runRecord && <MetaItem label="Provider" value={runRecord.providerType} />}
                </>
              )}
              {mode === "landing" && (
                <p className="col-span-2 text-xs text-muted-foreground/40">No item loaded.</p>
              )}
            </div>
          )}

          {activeTab === "trace" && (
            <div className="space-y-2">
              {runEvents.length > 0 ? (
                runEvents.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2 rounded border border-border/40 bg-muted/20 px-2.5 py-1 text-xs">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      ev.level === "error" ? "bg-destructive" :
                      ev.level === "warn"  ? "bg-amber-500" :
                      "bg-emerald-500/60"
                    )} />
                    <span className="text-muted-foreground/50 text-[10px] shrink-0">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                    <span className="text-muted-foreground shrink-0">[{ev.tag}]</span>
                    <span className="truncate text-foreground/70">{ev.message}</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <span className="text-muted-foreground/30">›</span>
                    <span>Execution trace entries will appear here during and after runs.</span>
                  </div>
                  <div className="flex flex-wrap gap-2 opacity-20 pointer-events-none" aria-hidden>
                    {[{ label: "Init", status: "ok" }, { label: "Step 1", status: "ok" }, { label: "Tool call", status: "ok" }, { label: "Step 2", status: "pending" }, { label: "Complete", status: "pending" }].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                        <div className={cn("w-1.5 h-1.5 rounded-full", item.status === "ok" ? "bg-emerald-500/60" : "bg-muted-foreground/40")} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
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

// ─── Studio Entry Modal ───────────────────────────────────────────────────────

interface EntryAction {
  key: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  description: string;
  onClick: () => void;
}

function StudioEntryModal({
  open,
  onClose,
  onNewBlueprint,
  onBrowseBlueprints,
  onBrowseInstances,
}: {
  open: boolean;
  onClose: () => void;
  onNewBlueprint: () => void;
  onBrowseBlueprints: () => void;
  onBrowseInstances: () => void;
}) {
  const actions: EntryAction[] = [
    {
      key: "blueprints",
      icon: <Workflow size={22} />,
      iconBg: "bg-violet-500/15 text-violet-400 border-violet-500/25",
      title: "Blueprints",
      subtitle: "Browse & Preview",
      description: "Explore your saved workflow blueprints, inspect steps, agents, skills, and tools.",
      onClick: onBrowseBlueprints,
    },
    {
      key: "new",
      icon: <PenLine size={22} />,
      iconBg: "bg-[var(--grace-accent)]/15 text-[var(--grace-accent)] border-[var(--grace-accent)]/25",
      title: "New Blueprint",
      subtitle: "Design from Scratch",
      description: "Define a new multi-step agent workflow. Set agents, skills, tools, and run order.",
      onClick: onNewBlueprint,
    },
    {
      key: "instances",
      icon: <Box size={22} />,
      iconBg: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
      title: "Instances",
      subtitle: "Run & Monitor",
      description: "Launch a workflow instance from any blueprint, track live run status and outputs.",
      onClick: onBrowseInstances,
    },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">

        {/* Subtle constellation background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute top-4 right-12 w-32 h-24 rounded-xl border border-border/10 bg-[var(--grace-accent)]/3" />
          <div className="absolute bottom-8 left-6 w-20 h-16 rounded-lg border border-border/10" />
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-[var(--grace-accent)]/20" />
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-[var(--grace-accent)]/15" />
        </div>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] tracking-[0.22em] uppercase text-[var(--grace-accent)] font-semibold mb-2">
                STUDIO
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                What would you like to do?
              </h2>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Choose an action to get started in the workflow studio.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1 -mt-1 -mr-1"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action cards */}
        <div className="relative px-8 pb-8 grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-5 text-left transition-all duration-200 hover:border-[var(--grace-accent)]/40 hover:bg-[var(--grace-accent)]/5 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--grace-accent)]"
            >
              {/* Icon badge */}
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg border",
                action.iconBg,
              )}>
                {action.icon}
              </div>

              {/* Text */}
              <div className="flex-1">
                <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/50 mb-1">
                  {action.subtitle}
                </p>
                <p className="text-sm font-semibold text-foreground mb-1.5 group-hover:text-[var(--grace-accent)] transition-colors">
                  {action.title}
                </p>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              <div className="self-end text-muted-foreground/30 group-hover:text-[var(--grace-accent)]/60 transition-colors">
                <ArrowRight size={13} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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

  // Studio entry modal
  const [entryOpen, setEntryOpen] = useState(true);
  const [newBlueprintOpen, setNewBlueprintOpen] = useState(false);

  // Run state
  const [runRecord, setRunRecord] = useState<RunRecord | null>(null);
  const [runStarting, setRunStarting] = useState(false);

  // Delete instance
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Step inspector state
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);

  // Bottom panel state — lifted so info panel can open tabs
  const [bottomActiveTab, setBottomActiveTab] = useState<BottomTab>("steps");
  const [bottomOpen, setBottomOpen] = useState(true);

  function openBottomTab(tab: BottomTab) {
    setBottomActiveTab(tab);
    setBottomOpen(true);
  }

  const mode: StudioMode = blueprintId ? "blueprint" : instanceId ? "instance" : "landing";
  const providerConnected = providerService.isConnected();

  // Re-open entry modal whenever user navigates back to /grace/studio (landing)
  useEffect(() => {
    if (mode === "landing") setEntryOpen(true);
  }, [mode]);

  function handleCenterTab(tab: CenterTab) {
    setCenterTab(tab);
    if (tab === "runtime") setSelectedStep(null);
  }

  // Auto-switch to Runtime tab when run is active (instance mode only)
  useEffect(() => {
    if (runRecord?.status === "running" && centerTab === "flow") {
      setCenterTab("runtime");
    }
  }, [runRecord?.status]);

  // Blueprint mode never shows Runtime — reset if somehow selected
  useEffect(() => {
    if (mode === "blueprint" && centerTab === "runtime") {
      setCenterTab("flow");
    }
  }, [mode, centerTab]);

  // Drag-to-resize chat panel
  const handleStartChatResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = chatWidth;
    function onMove(ev: MouseEvent) {
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

  // Compute studio agents
  const studioAgents: StudioAgent[] = (() => {
    if (mode === "blueprint" && blueprint) {
      const agents: StudioAgent[] = [];
      if (blueprint.agentConfig.primary) {
        agents.push({ id: "primary", label: blueprint.agentConfig.primary.label, role: blueprint.agentConfig.primary.role, linked: false });
      }
      blueprint.agentConfig.specialists?.forEach((sp, i) => {
        agents.push({ id: `specialist-${i}`, label: sp.label, role: sp.role, linked: false });
      });
      return agents;
    }
    if (mode === "instance" && instance) {
      return instance.agentAssignments.map((a) => ({
        id: a.agentId || `${a.role}-${a.label}`,
        label: a.agentName || a.label,
        role: a.role,
        linked: !!a.agentId,
      }));
    }
    return [];
  })();

  // Load blueprint/instance; restore latest run if instance
  useEffect(() => {
    setInitializing(true);
    setNotFound(false);
    setBlueprint(null);
    setInstance(null);
    setSelectedStep(null);
    setRunRecord(null);

    if (blueprintId) {
      const bp = blueprintService.getById(blueprintId);
      if (bp) setBlueprint(bp); else setNotFound(true);
    } else if (instanceId) {
      const inst = instanceService.getById(instanceId);
      if (inst) {
        setInstance(inst);
        const latestRun = runService.getLatestRun(instanceId);
        if (latestRun) setRunRecord(latestRun);
      } else {
        setNotFound(true);
      }
    }

    setInitializing(false);
  }, [blueprintId, instanceId]);

  // Phase 8: Poll server for real run state when a providerRunId is present.
  // Polls GET /api/grace/run/:providerRunId/poll every 3 seconds while running.
  // When the run completes/fails, stops polling and syncs local RunRecord.
  useEffect(() => {
    const providerRunId = runRecord?.providerRunId;
    if (!providerRunId || runRecord?.status !== "running") return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/grace/run/${providerRunId}/poll`);
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          status: string;
          events: Array<{ t: string; stream: string; chunk: string }>;
          errorMessage?: string | null;
          completedAt?: string | null;
        };

        if (cancelled) return;

        // Append new events as run log entries (deduplicated by checking lastEventCount)
        if (data.events && runRecord) {
          for (const ev of data.events.slice(-10)) {
            runService.appendEvent(runRecord.id, {
              level: ev.stream === "stderr" ? "warn" : "info",
              tag: ev.stream === "system" ? "GRACE" : "OPENCLAW",
              message: ev.chunk,
            });
          }
        }

        if (cancelled) return;

        // If terminal status, update local record
        if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
          if (runRecord) {
            runService.updateRunStatus(
              runRecord.id,
              data.status as "completed" | "failed" | "cancelled",
            );
            if (data.errorMessage) {
              runService.appendEvent(runRecord.id, {
                level: "warn",
                tag: "GRACE",
                message: `Provider reported: ${data.errorMessage}`,
              });
            }
            // Persist a run completion output record to grace.outputs.v1
            if (data.status === "completed" && instance) {
              outputService.addFromRun({
                runId: runRecord.id,
                instanceId: instance.id,
                instanceName: instance.name,
                type: "text",
                label: `${instance.name} — run output`,
                content: `Run completed at ${new Date().toISOString()}. Logs available in Studio.`,
              });
            }
            if (!cancelled) setRunRecord(runService.getById(runRecord.id));
          }
          if (!cancelled && instanceId && instance) {
            const updated = instanceService.updateStatus(
              instanceId,
              data.status === "completed" ? "completed" : "failed",
            );
            if (updated && !cancelled) setInstance(updated);
          }
        } else {
          // Still running — refresh run record for latest events
          if (!cancelled && runRecord) setRunRecord(runService.getById(runRecord.id));
        }
      } catch {
        // Network error during poll — silent, will retry next tick
      }
    }

    const intervalId = setInterval(poll, 3000);
    void poll(); // immediate first poll

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [runRecord?.providerRunId, runRecord?.status, runRecord?.id, instance, instanceId]);

  async function handleStartRun() {
    if (!instance || !instanceId) return;
    if (!providerConnected) return;

    setRunStarting(true);
    const active = providerService.getActive();
    if (!active) { setRunStarting(false); return; }

    // Collect input asset IDs attached to this instance
    const inputAssets = inputService.getForInstance(instance.id);
    const inputAssetIds = inputAssets.map((a) => a.id);

    const result = await active.provider.startRun(active.config, {
      instanceId: instance.id,
      instanceName: instance.name,
      steps: instance.graphSnapshot.map((s) => ({ id: s.id, name: s.name })),
      agentAssignments: instance.agentAssignments,
      inputAssetIds,
    });

    const run = runService.createRun({
      instanceId: instance.id,
      instanceName: instance.name,
      providerType: active.config.type,
      stepNames: instance.graphSnapshot.map((s) => ({ id: s.id, name: s.name })),
      providerRunId: result.providerRunId,
    });

    // Append provider feedback
    if (result.message) {
      runService.appendEvent(run.id, {
        level: result.status === "failed" ? "warn" : "info",
        tag: "PROVIDER",
        message: result.message,
      });
    }

    // Update instance status
    const updated = instanceService.updateStatus(instance.id, result.status === "failed" ? "failed" : "running");
    if (updated) setInstance(updated);

    setRunRecord(runService.getById(run.id));
    setRunStarting(false);
    setCenterTab("runtime");
  }

  function handleStopRun() {
    if (!runRecord || !instance) return;
    runService.updateRunStatus(runRecord.id, "cancelled");
    runService.appendEvent(runRecord.id, {
      level: "info",
      tag: "GRACE",
      message: "Run cancelled by user.",
    });
    const updated = instanceService.updateStatus(instance.id, "cancelled");
    if (updated) setInstance(updated);
    setRunRecord(runService.getById(runRecord.id));
  }

  function handleSendMessage(msg: string) {
    if (!runRecord) return;
    // Store user message
    runService.appendChatMessage(runRecord.id, {
      role: "user",
      content: msg,
    });
    // Append event
    runService.appendEvent(runRecord.id, {
      level: "info",
      tag: "USER",
      message: `User message: ${msg.slice(0, 80)}${msg.length > 80 ? "…" : ""}`,
    });
    // Append a system response noting the current capability boundary
    runService.appendChatMessage(runRecord.id, {
      role: "system",
      content: "Message recorded. Sending messages to a running agent session is not yet supported — logs and outputs are available in the panel below.",
    });
    setRunRecord(runService.getById(runRecord.id));
  }

  function handleBack() {
    if (mode === "blueprint") navigate("/grace/library");
    else if (mode === "instance") navigate("/grace/instances");
    else navigate("/grace/home");
  }

  function handleInstanceCreated(newInstance: ReturnType<typeof instanceService.create>) {
    setCreateInstanceOpen(false);
    navigate(`/grace/studio/instance/${newInstance.id}`);
  }

  function handleDeleteInstance() {
    if (!instanceId) return;
    instanceService.remove(instanceId);
    navigate("/grace/instances");
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
        runRecord={runRecord}
        onStartRun={handleStartRun}
        onStopRun={handleStopRun}
        runStarting={runStarting}
        providerConnected={providerConnected}
      />

      <div className="flex flex-1 overflow-hidden">
        {leftOpen && mode !== "landing" && (
          <LeftPanel
            mode={mode} blueprint={blueprint} instance={instance}
            onDeleteInstance={mode === "instance" ? () => setDeleteOpen(true) : undefined}
          />
        )}

        <CenterCanvas
          mode={mode} blueprint={blueprint} instance={instance}
          centerTab={centerTab}
          agents={studioAgents}
          selectedStep={selectedStep}
          onInspect={(step) => setSelectedStep(step)}
          onInspectorClose={() => setSelectedStep(null)}
          runRecord={runRecord}
          onOpenBottomTab={openBottomTab}
        />

        <RightPanel
          mode={mode}
          width={chatWidth}
          onStartResize={handleStartChatResize}
          runRecord={runRecord}
          onSendMessage={handleSendMessage}
        />
      </div>

      <BottomPanel
        mode={mode} blueprint={blueprint} instance={instance} runRecord={runRecord}
        activeTab={bottomActiveTab} open={bottomOpen}
        onSetActiveTab={setBottomActiveTab} onSetOpen={setBottomOpen}
      />

      {blueprint && (
        <CreateInstanceModal
          blueprint={blueprint}
          open={createInstanceOpen}
          onClose={() => setCreateInstanceOpen(false)}
          onCreated={handleInstanceCreated}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Instance"
        description={`Are you sure you want to delete "${instance?.name ?? "this instance"}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteInstance}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Studio entry modal — shown automatically on landing */}
      {mode === "landing" && (
        <StudioEntryModal
          open={entryOpen}
          onClose={() => setEntryOpen(false)}
          onBrowseBlueprints={() => navigate("/grace/library")}
          onNewBlueprint={() => {
            setEntryOpen(false);
            setNewBlueprintOpen(true);
          }}
          onBrowseInstances={() => navigate("/grace/instances")}
        />
      )}

      <CreateWorkflowModal
        open={newBlueprintOpen}
        onClose={() => setNewBlueprintOpen(false)}
        onCreated={(bp) => {
          setNewBlueprintOpen(false);
          navigate(`/grace/studio/blueprint/${bp.id}`);
        }}
      />
    </div>
  );
}
