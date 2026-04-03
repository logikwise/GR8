/**
 * Studio — Phase 2
 *
 * Handles three contexts from the same route shell:
 *   1. Landing  (/grace/studio)                       — no item selected
 *   2. Blueprint mode (/grace/studio/blueprint/:id)   — template view, Create Instance CTA
 *   3. Instance mode  (/grace/studio/instance/:id)    — instance view, execution placeholder
 *
 * Architecture note: the left panel, center area, right chat, and bottom console
 * are intentionally modular. In Phase 3 these will become independent draggable
 * panels/drawers on a canvas surface. Do not tighten layout assumptions here.
 *
 * GRACE-REVIEW: Phase 3 will replace the placeholder center area with a real
 * Flow/Graph editor. Right chat panel will stream live agent messages.
 * Bottom console will stream tool calls and log events.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router";
import {
  Cpu,
  ArrowLeft,
  AlertCircle,
  Layers,
  BookOpen,
  FileText,
  Zap,
  Wrench,
  Users,
  CircleDot,
} from "lucide-react";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { CreateInstanceModal } from "../components/CreateInstanceModal";
import { BlueprintStepList } from "../components/BlueprintStepList";
import type { Blueprint } from "../blueprints/blueprintTypes";
import type { Instance } from "../instances/instanceTypes";
import { cn } from "@/lib/utils";

type StudioMode = "landing" | "blueprint" | "instance";

type LeftPanelTab = "steps" | "skills" | "tools" | "outputs";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/60",
  ready: "text-sky-600 bg-sky-500/10",
  running: "text-emerald-600 bg-emerald-500/10",
  paused: "text-amber-600 bg-amber-500/10",
  completed: "text-blue-600 bg-blue-500/10",
  failed: "text-destructive bg-destructive/10",
  cancelled: "text-muted-foreground bg-muted/40",
};

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
  return (
    <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between bg-card/50 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Back"
        >
          <ArrowLeft size={13} />
        </button>
        <Cpu size={15} className="text-[var(--grace-accent)] shrink-0" />
        <span className="text-sm font-semibold truncate">
          {mode === "landing" && "Studio"}
          {mode === "blueprint" && (blueprint?.name ?? "Blueprint")}
          {mode === "instance" && (instance?.name ?? "Instance")}
        </span>

        {mode === "blueprint" && (
          <span className="shrink-0 rounded border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--grace-accent)] uppercase tracking-wide">
            Blueprint Template
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
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {mode === "blueprint" && (
          <button
            type="button"
            onClick={onCreateInstance}
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Layers size={13} />
            Create Instance
          </button>
        )}
        {mode === "instance" && (
          <button
            type="button"
            disabled
            title="Execution is not available in Phase 2"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-50"
          >
            Start Run
          </button>
        )}
      </div>
    </div>
  );
}

function LeftPanel({
  mode,
  blueprint,
  instance,
}: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
}) {
  const [activeTab, setActiveTab] = useState<LeftPanelTab>("steps");

  const TABS: { id: LeftPanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "steps", label: "Steps", icon: <CircleDot size={12} /> },
    { id: "skills", label: "Skills", icon: <Zap size={12} /> },
    { id: "tools", label: "Tools", icon: <Wrench size={12} /> },
    { id: "outputs", label: "Outputs", icon: <FileText size={12} /> },
  ];

  const steps =
    mode === "blueprint"
      ? (blueprint?.steps ?? [])
      : mode === "instance"
      ? (instance?.graphSnapshot ?? [])
      : [];

  const allSkills = mode === "blueprint"
    ? blueprint?.steps.flatMap((s) => s.skills ?? []) ?? []
    : [];

  const allTools = mode === "blueprint"
    ? blueprint?.steps.flatMap((s) => s.tools ?? []) ?? []
    : [];

  const outputs = mode === "blueprint" ? (blueprint?.outputs ?? []) : [];

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-card/30">
      <div className="flex border-b border-border/60">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={cn(
              "flex flex-1 items-center justify-center py-2 text-xs transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-[var(--grace-accent)] text-[var(--grace-accent)]"
                : "text-muted-foreground/60 hover:text-muted-foreground"
            )}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {TABS.find((t) => t.id === activeTab)?.label}
        </p>

        {activeTab === "steps" && (
          <div className="space-y-1">
            {steps.length === 0 && (
              <p className="text-xs text-muted-foreground/50">No steps defined.</p>
            )}
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent/50 cursor-default"
              >
                <span className="mt-px text-[10px] font-bold text-[var(--grace-accent)]/60 w-4 shrink-0 text-right">
                  {idx + 1}
                </span>
                <span className="text-foreground leading-tight">{step.name}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-1">
            {allSkills.length === 0 && <p className="text-xs text-muted-foreground/50">No skills attached.</p>}
            {[...new Map(allSkills.map((s) => [s.id, s])).values()].map((skill) => (
              <div key={skill.id} className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
                <Zap size={10} className="text-[var(--grace-accent)]/60 shrink-0" />
                {skill.name}
              </div>
            ))}
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-1">
            {allTools.length === 0 && <p className="text-xs text-muted-foreground/50">No tools attached.</p>}
            {[...new Map(allTools.map((t) => [t.id, t])).values()].map((tool) => (
              <div key={tool.id} className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
                <Wrench size={10} className="shrink-0" />
                {tool.name}
              </div>
            ))}
          </div>
        )}

        {activeTab === "outputs" && (
          <div className="space-y-1">
            {outputs.length === 0 && <p className="text-xs text-muted-foreground/50">No outputs defined.</p>}
            {outputs.map((out) => (
              <div key={out.id} className="flex flex-col gap-0.5 rounded px-2 py-1.5 text-xs">
                <span className="font-medium text-foreground">{out.name}</span>
                <span className="text-muted-foreground/70">{out.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function CenterPanel({ mode, blueprint, instance }: {
  mode: StudioMode;
  blueprint?: Blueprint | null;
  instance?: Instance | null;
}) {
  if (mode === "landing") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background/50 p-8 text-center">
        <Cpu size={36} className="text-muted-foreground/30" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">No item open in Studio</p>
          <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">
            Open a Blueprint from the Workflow Library, or select an Instance from the Instances page.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "blueprint" && blueprint) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mb-4 rounded-lg border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)] px-4 py-3 text-sm text-[var(--grace-accent)]">
          <span className="font-semibold">Blueprint Template</span>
          <span className="ml-2 text-[var(--grace-accent)]/80">
            — this is a read-only template. Use "Create Instance" to run this workflow.
          </span>
        </div>

        <div className="mb-3">
          <h2 className="text-base font-semibold text-foreground">{blueprint.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{blueprint.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">
              {blueprint.workflowType.replace("-", " ")} · v{blueprint.version} · {blueprint.steps.length} steps
            </span>
          </div>
        </div>

        <div className="mt-2 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Flow Preview</p>
          <BlueprintStepList steps={blueprint.steps} />
        </div>

        {(blueprint.agentConfig.primary || (blueprint.agentConfig.specialists?.length ?? 0) > 0) && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users size={11} /> Agent Requirements
            </p>
            <div className="space-y-2">
              {blueprint.agentConfig.primary && (
                <div className="text-sm">
                  <span className="font-medium text-foreground">{blueprint.agentConfig.primary.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted/60 rounded px-1.5 py-0.5">primary</span>
                  {blueprint.agentConfig.primary.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{blueprint.agentConfig.primary.description}</p>
                  )}
                </div>
              )}
              {blueprint.agentConfig.specialists?.map((sp) => (
                <div key={sp.label} className="text-sm">
                  <span className="font-medium text-foreground">{sp.label}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase bg-muted/60 rounded px-1.5 py-0.5">specialist</span>
                  {!sp.required && <span className="ml-1 text-[10px] text-muted-foreground/60">(optional)</span>}
                  {sp.description && <p className="mt-0.5 text-xs text-muted-foreground">{sp.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {blueprint.instanceConfig.questions.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Instance Questions ({blueprint.instanceConfig.questions.length})
            </p>
            <div className="space-y-1.5">
              {blueprint.instanceConfig.questions.map((q) => (
                <div key={q.id} className="flex items-start gap-2 text-xs">
                  <span className="text-foreground font-medium min-w-0 flex-1">{q.label}</span>
                  <span className="text-muted-foreground/60 shrink-0">{q.type}{q.required ? " *" : ""}</span>
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
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{instance.name}</span>
          <span className="ml-2">from Blueprint: {instance.blueprintName}</span>
        </div>

        {/* GRACE-REVIEW: Phase 3 — replace this with a real Flow/Graph editor canvas */}
        <div className="flex-1 rounded-lg border border-dashed border-border bg-background/40 flex flex-col items-center justify-center gap-3 p-8 text-center min-h-48">
          <AlertCircle size={28} className="text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Flow editor coming in Phase 3</p>
            <p className="mt-1 text-xs text-muted-foreground/60 max-w-xs">
              The graph/flow canvas will render here. For now, see the step list in the left panel.
            </p>
          </div>
        </div>

        {instance.configSnapshot.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Configuration</p>
            <div className="space-y-1">
              {instance.configSnapshot.map((ans) => (
                <div key={ans.questionId} className="flex justify-between text-xs gap-4">
                  <span className="text-muted-foreground">{ans.label}</span>
                  <span className="font-medium text-foreground">{String(ans.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {instance.agentAssignments.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Users size={11} /> Agent Assignments
            </p>
            <div className="space-y-1">
              {instance.agentAssignments.map((a) => (
                <div key={a.role + a.label} className="flex justify-between text-xs gap-4">
                  <span className="text-muted-foreground">{a.label} <span className="text-[10px] uppercase">[{a.role}]</span></span>
                  <span className="font-medium text-foreground">{a.agentName}</span>
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

function RightPanel({ mode }: { mode: StudioMode }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-card/30 p-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Chat</p>
      <div className="flex-1 rounded border border-dashed border-border/50 flex items-center justify-center">
        {/* GRACE-REVIEW: Phase 3 — wire to live agent message stream */}
        <p className="text-xs text-muted-foreground/50 text-center px-3">
          {mode === "landing" ? "No item open" : "No active run"}
        </p>
      </div>
    </aside>
  );
}

function BottomConsole({ mode }: { mode: StudioMode }) {
  return (
    <div className="shrink-0 border-t border-border bg-card/30 px-4 py-2 h-28 flex flex-col">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Console</p>
      {/* GRACE-REVIEW: Phase 3 — wire to tool call / log stream */}
      <div className="font-mono text-xs text-muted-foreground/50">
        {mode === "landing" && "> Open a Blueprint or Instance to begin."}
        {mode === "blueprint" && "> Blueprint loaded. Create an Instance to run."}
        {mode === "instance" && "> Instance loaded. Execution coming in Phase 3."}
      </div>
    </div>
  );
}

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
        <button type="button" onClick={handleBack}
          className="text-xs text-[var(--grace-accent)] hover:underline">
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

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel mode={mode} blueprint={blueprint} instance={instance} />
        <CenterPanel mode={mode} blueprint={blueprint} instance={instance} />
        <RightPanel mode={mode} />
      </div>

      <BottomConsole mode={mode} />

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
