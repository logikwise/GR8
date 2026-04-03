/**
 * Studio — Phase 2
 *
 * Layout (matches reference design):
 *   ┌─────────────────────────────────────────────────────┐
 *   │  Header: back · name · status badge · top controls  │
 *   ├──────────────────────────────────────┬──────────────┤
 *   │                                      │              │
 *   │   Center Canvas (full width)         │  Right Chat  │
 *   │                                      │              │
 *   ├──────────────────────────────────────┴──────────────┤
 *   │  Bottom bar: Logs | Steps | Skills | Tools | Outputs│
 *   └─────────────────────────────────────────────────────┘
 *
 * The left panel has been removed — all structural info lives in the
 * bottom drawer tabs, freeing the canvas for the graph/flow surface.
 *
 * GRACE-REVIEW: Phase 3 — real Flow/Graph canvas in center, live log
 * streaming in bottom, live agent chat in right panel.
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
} from "lucide-react";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { CreateInstanceModal } from "../components/CreateInstanceModal";
import { BlueprintStepList } from "../components/BlueprintStepList";
import type { Blueprint } from "../blueprints/blueprintTypes";
import type { Instance } from "../instances/instanceTypes";
import { cn } from "@/lib/utils";

type StudioMode = "landing" | "blueprint" | "instance";

type BottomTab = "logs" | "steps" | "skills" | "tools" | "outputs";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/60",
  ready: "text-sky-600 bg-sky-500/10",
  running: "text-emerald-600 bg-emerald-500/10",
  paused: "text-amber-600 bg-amber-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  failed: "text-destructive bg-destructive/10",
  cancelled: "text-muted-foreground bg-muted/40",
};

// ─── Header ───────────────────────────────────────────────────────────────────

function StudioHeader({
  mode,
  blueprint,
  instance,
  onBack,
  onCreateInstance,
}: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
  onBack: () => void;
  onCreateInstance?: () => void;
}) {
  const modeLabel =
    mode === "blueprint" ? "Blueprint" : mode === "instance" ? "Flow" : null;

  return (
    <div className="shrink-0 border-b border-border px-3 py-2 flex items-center gap-2 bg-card/60">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
        title="Back"
      >
        <ArrowLeft size={14} />
      </button>

      {/* icon + name */}
      <div className="flex items-center gap-1.5 min-w-0">
        {mode === "blueprint" && <PenLine size={13} className="text-[var(--grace-accent)] shrink-0" />}
        {mode === "instance" && <Cpu size={13} className="text-[var(--grace-accent)] shrink-0" />}
        <span className="text-sm font-semibold truncate">
          {mode === "landing" && "Studio"}
          {mode === "blueprint" && (blueprint?.name ?? "Blueprint")}
          {mode === "instance" && (instance?.name ?? "Instance")}
        </span>
      </div>

      {/* status / mode badge */}
      {mode === "blueprint" && (
        <span className="shrink-0 rounded border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--grace-accent)] uppercase tracking-wide">
          Blueprint
        </span>
      )}
      {mode === "instance" && instance && (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            STATUS_COLORS[instance.status] ?? STATUS_COLORS.draft
          )}
        >
          {instance.status}
        </span>
      )}

      {/* center tab switcher (Graph · Flow · Runtime) — placeholder for Phase 3 */}
      {mode !== "landing" && (
        <div className="flex items-center gap-0 mx-auto border border-border rounded overflow-hidden text-xs">
          {["Graph", "Flow", "Runtime"].map((tab, i) => (
            <button
              key={tab}
              type="button"
              disabled={tab !== "Flow"}
              className={cn(
                "px-3 py-1 transition-colors",
                tab === "Flow"
                  ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
                  : "text-muted-foreground/50 cursor-not-allowed",
                i > 0 && "border-l border-border"
              )}
              title={tab !== "Flow" ? "Coming in Phase 3" : undefined}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* right controls */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {mode === "blueprint" && (
          <button
            type="button"
            onClick={onCreateInstance}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Layers size={12} />
            Create Instance
          </button>
        )}
        {mode === "instance" && (
          <button
            type="button"
            disabled
            title="Execution coming in Phase 3"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-40"
          >
            Start Run
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Center Canvas ─────────────────────────────────────────────────────────────

function CenterCanvas({ mode, blueprint, instance }: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
}) {
  if (mode === "landing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background/60 p-8 text-center">
        <Cpu size={40} className="text-muted-foreground/20" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No item open in Studio</p>
          <p className="mt-1 text-xs text-muted-foreground/50 max-w-xs">
            Open a Blueprint from the Workflow Library, or select an Instance from the Instances page.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "blueprint" && blueprint) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-4">
        <div className="rounded-lg border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)] px-4 py-2.5 text-sm text-[var(--grace-accent)]">
          <span className="font-semibold">Blueprint Template</span>
          <span className="ml-2 text-[var(--grace-accent)]/70 text-xs">
            Read-only — use "Create Instance" to execute this workflow.
          </span>
        </div>

        <div>
          <h2 className="text-base font-semibold">{blueprint.name}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{blueprint.description}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {blueprint.workflowType.replace("-", " ")} · v{blueprint.version} · {blueprint.steps.length} steps
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Flow Preview</p>
          <BlueprintStepList steps={blueprint.steps} />
        </div>

        {(blueprint.agentConfig.primary || (blueprint.agentConfig.specialists?.length ?? 0) > 0) && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users size={11} /> Agent Requirements
            </p>
            <div className="space-y-2">
              {blueprint.agentConfig.primary && (
                <div className="text-sm">
                  <span className="font-medium">{blueprint.agentConfig.primary.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted/60 rounded px-1.5 py-0.5">primary</span>
                  {blueprint.agentConfig.primary.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{blueprint.agentConfig.primary.description}</p>
                  )}
                </div>
              )}
              {blueprint.agentConfig.specialists?.map((sp) => (
                <div key={sp.label} className="text-sm">
                  <span className="font-medium">{sp.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted/60 rounded px-1.5 py-0.5">specialist</span>
                  {!sp.required && <span className="ml-1 text-[10px] text-muted-foreground/60">(optional)</span>}
                  {sp.description && <p className="mt-0.5 text-xs text-muted-foreground">{sp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {blueprint.instanceConfig.questions.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Instance Questions ({blueprint.instanceConfig.questions.length})
            </p>
            <div className="space-y-1.5">
              {blueprint.instanceConfig.questions.map((q) => (
                <div key={q.id} className="flex items-center justify-between text-xs gap-4">
                  <span className="font-medium">{q.label}</span>
                  <span className="text-muted-foreground/60">{q.type}{q.required ? " ·required" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "instance" && instance) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-4">
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-3">
          <span className="font-semibold text-foreground">{instance.name}</span>
          <span className="text-xs">from Blueprint: {instance.blueprintName}</span>
        </div>

        {/* GRACE-REVIEW: Phase 3 — replace with real Flow/Graph canvas */}
        <div className="flex-1 rounded-lg border border-dashed border-border/60 bg-background/30 flex flex-col items-center justify-center gap-3 p-8 text-center" style={{ minHeight: 220 }}>
          <div className="flex items-center gap-2 opacity-30">
            {instance.graphSnapshot.map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-16 h-10 rounded-lg border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] flex items-center justify-center">
                  <CircleDot size={10} className="text-[var(--grace-accent)]" />
                </div>
                {i < instance.graphSnapshot.length - 1 && (
                  <div className="w-6 h-px bg-[var(--grace-accent)]/30" />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50 mt-2">Graph canvas · Phase 3</p>
        </div>

        {instance.configSnapshot.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Configuration</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {instance.configSnapshot.map((ans) => (
                <div key={ans.questionId} className="flex justify-between text-xs gap-2 py-0.5">
                  <span className="text-muted-foreground truncate">{ans.label}</span>
                  <span className="font-medium shrink-0">{String(ans.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {instance.agentAssignments.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users size={11} /> Agent Assignments
            </p>
            <div className="space-y-1">
              {instance.agentAssignments.map((a) => (
                <div key={a.role + a.label} className="flex justify-between text-xs gap-4">
                  <span className="text-muted-foreground">{a.label} <span className="text-[10px] uppercase opacity-60">[{a.role}]</span></span>
                  <span className="font-medium">{a.agentName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Right Chat Panel ──────────────────────────────────────────────────────────

function RightPanel({ mode }: { mode: StudioMode }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-border bg-card/20">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <MessageSquare size={12} className="text-muted-foreground/60" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chat</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* GRACE-REVIEW: Phase 3 — wire to live agent message stream */}
        <p className="text-xs text-muted-foreground/40 text-center">
          {mode === "landing" ? "No item open" : "No active run"}
        </p>
      </div>
      {mode !== "landing" && (
        <div className="border-t border-border/60 p-2">
          <div className="flex items-center gap-2 rounded border border-border/60 bg-muted/20 px-3 py-1.5">
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

  const steps =
    mode === "blueprint"
      ? (blueprint?.steps ?? [])
      : mode === "instance"
      ? (instance?.graphSnapshot ?? [])
      : [];

  const allSkills = mode === "blueprint"
    ? [...new Map((blueprint?.steps ?? []).flatMap((s) => s.skills ?? []).map((s) => [s.id, s])).values()]
    : [];

  const allTools = mode === "blueprint"
    ? [...new Map((blueprint?.steps ?? []).flatMap((s) => s.tools ?? []).map((t) => [t.id, t])).values()]
    : [];

  const outputs = mode === "blueprint" ? (blueprint?.outputs ?? []) : [];

  const TABS: { id: BottomTab; label: string; icon: React.ReactNode }[] = [
    { id: "logs", label: "Logs", icon: <Terminal size={11} /> },
    { id: "steps", label: "Steps", icon: <ListChecks size={11} /> },
    { id: "skills", label: "Skills", icon: <Zap size={11} /> },
    { id: "tools", label: "Tools", icon: <Wrench size={11} /> },
    { id: "outputs", label: "Outputs", icon: <FileText size={11} /> },
  ];

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-card/30 flex flex-col transition-all duration-200",
        open ? "h-44" : "h-8"
      )}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/60 h-8 shrink-0 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); if (!open) setOpen(true); }}
            className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors border-b-2",
              activeTab === tab.id && open
                ? "border-[var(--grace-accent)] text-[var(--grace-accent)]"
                : "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex items-center justify-center w-7 h-7 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          title={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* Tab content */}
      {open && (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {activeTab === "logs" && (
            <div className="space-y-1 font-mono">
              {/* GRACE-REVIEW: Phase 3 — wire to real run log stream */}
              <p className="text-xs text-muted-foreground/40">
                {mode === "landing" && "> Open a Blueprint or Instance to begin."}
                {mode === "blueprint" && "> Blueprint loaded in template mode. Create an Instance to run."}
                {mode === "instance" && "> Instance loaded · status: " + (instance?.status ?? "draft") + " · Execution coming in Phase 3."}
              </p>
            </div>
          )}

          {activeTab === "steps" && (
            <div className="flex flex-wrap gap-2">
              {steps.length === 0 && <p className="text-xs text-muted-foreground/40">No steps defined.</p>}
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <span className="font-bold text-[var(--grace-accent)]/60 text-[10px]">{idx + 1}</span>
                  <span className="text-foreground">{step.name}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="flex flex-wrap gap-2">
              {allSkills.length === 0 && <p className="text-xs text-muted-foreground/40">No skills attached.</p>}
              {allSkills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <Zap size={10} className="text-[var(--grace-accent)]/60" />
                  {skill.name}
                </div>
              ))}
            </div>
          )}

          {activeTab === "tools" && (
            <div className="flex flex-wrap gap-2">
              {allTools.length === 0 && <p className="text-xs text-muted-foreground/40">No tools attached.</p>}
              {allTools.map((tool) => (
                <div key={tool.id} className="flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2.5 py-1 text-xs">
                  <Wrench size={10} className="text-muted-foreground/60" />
                  {tool.name}
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
        </div>
      )}
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export function GraceStudio() {
  const { blueprintId, instanceId } = useParams<{ blueprintId?: string; instanceId?: string }>();
  const navigate = useNavigate();

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);

  const mode: StudioMode = blueprintId ? "blueprint" : instanceId ? "instance" : "landing";

  useEffect(() => {
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
        onBack={handleBack}
        onCreateInstance={() => setCreateInstanceOpen(true)}
      />

      {/* Main work area */}
      <div className="flex flex-1 overflow-hidden">
        <CenterCanvas mode={mode} blueprint={blueprint} instance={instance} />
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
