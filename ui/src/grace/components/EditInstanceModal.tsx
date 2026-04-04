/**
 * EditInstanceModal — edit an existing Instance outside of Studio.
 *
 * Sections:
 *   General      — rename, change status
 *   Configuration — revisit answered questions from the source blueprint
 *   Agents       — reassign agents to roles (discovery-aware picker)
 *   Workflow     — per-step prompt overrides
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Settings2, Users, Wrench, Workflow,
  Bot, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
} from "lucide-react";
import type { Instance, InstanceStatus, AnsweredQuestion, AgentAssignment } from "../instances/instanceTypes";
import type { BlueprintQuestion } from "../blueprints/blueprintTypes";
import { blueprintService } from "../blueprints/blueprintService";
import { instanceService } from "../instances/instanceService";
import { agentDiscoveryService } from "../providers/agentDiscoveryService";
import type { DiscoveredAgent } from "../providers/providerTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITABLE_STATUSES: InstanceStatus[] = [
  "draft", "ready", "paused", "completed", "cancelled",
];

const STATUS_LABELS: Record<InstanceStatus, string> = {
  draft:     "Draft",
  ready:     "Ready",
  running:   "Running",
  paused:    "Paused",
  completed: "Completed",
  failed:    "Failed",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<InstanceStatus, string> = {
  draft:     "text-muted-foreground",
  ready:     "text-sky-500",
  running:   "text-emerald-500",
  paused:    "text-amber-500",
  completed: "text-blue-500",
  failed:    "text-destructive",
  cancelled: "text-muted-foreground/50",
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon, title, subtitle, open, onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 py-2 text-left group"
    >
      <span className="text-[var(--grace-accent)]/70">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground/50 truncate">{subtitle}</p>}
      </div>
      <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </span>
    </button>
  );
}

// ─── Question field ───────────────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: BlueprintQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  if (question.type === "boolean") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--grace-accent)]"
        />
        <span className="text-sm text-foreground">{question.label}</span>
        {question.required && <span className="text-destructive text-xs">*</span>}
      </label>
    );
  }

  if (question.type === "select" && question.options) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-foreground">
          {question.label}{question.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-[var(--grace-accent)]/60"
        >
          <option value="">Select…</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {question.hint && <p className="text-[10px] text-muted-foreground/60">{question.hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-foreground">
        {question.label}{question.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <Input
        type={question.type === "number" ? "number" : "text"}
        value={String(value ?? "")}
        onChange={(e) => onChange(question.type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={question.placeholder ?? ""}
        className="text-xs"
      />
      {question.hint && <p className="text-[10px] text-muted-foreground/60">{question.hint}</p>}
    </div>
  );
}

// ─── Agent picker row ─────────────────────────────────────────────────────────

function AgentRow({
  label,
  role,
  description,
  capabilities,
  required,
  currentName,
  discoveredAgents,
  onChange,
}: {
  label: string;
  role: string;
  description?: string;
  capabilities?: string[];
  required: boolean;
  currentName: string;
  discoveredAgents: DiscoveredAgent[];
  onChange: (name: string) => void;
}) {
  const hasAgents = discoveredAgents.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <p className="text-xs font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </p>
        <span className="text-[9px] uppercase font-medium text-muted-foreground/50 tracking-wide">{role}</span>
      </div>
      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

      {hasAgents ? (
        <div className="space-y-1">
          <div className="grid gap-1">
            {discoveredAgents.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange(a.name)}
                className={cn(
                  "w-full flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs text-left transition-all",
                  currentName === a.name
                    ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                    : "border-border bg-card hover:border-[var(--grace-accent)]/40 text-foreground/80",
                )}
              >
                <Bot size={11} className="shrink-0" />
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground/50 text-[10px]">{a.type}</span>
                {a.status && a.status !== "unknown" && (
                  <span className={cn(
                    "ml-auto text-[9px] uppercase font-medium",
                    a.status === "available" ? "text-emerald-500" :
                    a.status === "busy"      ? "text-amber-500" :
                    "text-muted-foreground/30",
                  )}>
                    {a.status}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/40 pt-0.5">Or type a custom identifier:</p>
          <Input
            value={currentName}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Agent name or ID"
            className="text-xs"
          />
        </div>
      ) : (
        <Input
          value={currentName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Agent name or identifier"
          className="text-xs"
        />
      )}

      {capabilities && capabilities.length > 0 && (
        <p className="text-[10px] text-muted-foreground/50">
          Recommended: {capabilities.join(", ")}
        </p>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

type EditInstanceTab = "general" | "config" | "agents" | "workflow";

export function EditInstanceModal({
  instance,
  open,
  onClose,
  onSaved,
  initialTab,
}: {
  instance: Instance;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Instance) => void;
  initialTab?: EditInstanceTab;
}) {
  const blueprint = blueprintService.getById(instance.blueprintId);
  const discovery = agentDiscoveryService.getLastDiscovery();
  const discoveredAgents: DiscoveredAgent[] = discovery?.agents ?? [];

  // ── Local edit state ──────────────────────────────────────────────────────
  const [name,    setName]   = useState(instance.name);
  const [status,  setStatus] = useState<InstanceStatus>(instance.status);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>(
    Object.fromEntries(instance.configSnapshot.map((q) => [q.questionId, q.value]))
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(
    Object.fromEntries(instance.agentAssignments.map((a) => [`${a.role}-${a.label}`, a.agentName]))
  );
  const [stepPrompts, setStepPrompts] = useState<Record<string, string>>(
    Object.fromEntries(
      instance.graphSnapshot
        .filter((s) => s.prompt)
        .map((s) => [s.id, s.prompt!])
    )
  );

  // ── Section open/closed — initialTab jumps to the right section ───────────
  const [secGeneral, setSecGeneral]   = useState(!initialTab || initialTab === "general");
  const [secConfig,  setSecConfig]    = useState(initialTab === "config");
  const [secAgents,  setSecAgents]    = useState(initialTab === "agents");
  const [secWorkflow, setSecWorkflow] = useState(initialTab === "workflow");

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  // Reset when instance changes
  useEffect(() => {
    setName(instance.name);
    setStatus(instance.status);
    setAnswers(Object.fromEntries(instance.configSnapshot.map((q) => [q.questionId, q.value])));
    setAssignments(Object.fromEntries(instance.agentAssignments.map((a) => [`${a.role}-${a.label}`, a.agentName])));
    setStepPrompts(Object.fromEntries(
      instance.graphSnapshot.filter((s) => s.prompt).map((s) => [s.id, s.prompt!])
    ));
    setError(null);
  }, [instance.id]);

  const questions   = blueprint?.instanceConfig?.questions ?? [];
  const agentReqs   = [
    ...(blueprint?.agentConfig?.primary    ? [{ ...blueprint.agentConfig.primary,   role: "primary"    as const, required: true  }] : []),
    ...(blueprint?.agentConfig?.specialists ?? []).map((s) => ({ ...s, role: "specialist" as const, required: false })),
  ];
  const steps = instance.graphSnapshot;

  function setAnswer(qId: string, val: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }
  function setAgent(key: string, name: string) {
    setAssignments((prev) => ({ ...prev, [key]: name }));
  }
  function setPrompt(stepId: string, prompt: string) {
    setStepPrompts((prev) => ({ ...prev, [stepId]: prompt }));
  }

  function validate(): string | null {
    if (!name.trim()) return "Instance name is required.";
    for (const q of questions) {
      if (q.required) {
        const v = answers[q.id];
        if (v === undefined || v === "" || v === null) {
          return `"${q.label}" is required.`;
        }
      }
    }
    for (const req of agentReqs) {
      if (req.required) {
        const key = `${req.role}-${req.label}`;
        if (!assignments[key]?.trim()) {
          return `Agent assignment for "${req.label}" is required.`;
        }
      }
    }
    return null;
  }

  function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);

    const updatedConfigSnapshot: AnsweredQuestion[] = questions.map((q) => ({
      questionId: q.id,
      label:      q.label,
      value:      answers[q.id] ?? q.defaultValue ?? "",
    }));

    const updatedAssignments: AgentAssignment[] = agentReqs
      .filter((req) => assignments[`${req.role}-${req.label}`]?.trim())
      .map((req) => ({
        role:      req.role,
        label:     req.label,
        agentId:   assignments[`${req.role}-${req.label}`].trim().toLowerCase().replace(/\s+/g, "-"),
        agentName: assignments[`${req.role}-${req.label}`].trim(),
      }));

    const updatedSnapshot = steps.map((s) => ({
      ...s,
      prompt: stepPrompts[s.id] ?? s.prompt,
    }));

    const updated = instanceService.update(instance.id, {
      name:             name.trim(),
      status,
      configSnapshot:   updatedConfigSnapshot,
      agentAssignments: updatedAssignments,
      graphSnapshot:    updatedSnapshot,
    });

    setSaving(false);
    if (updated) {
      onSaved(updated);
      onClose();
    } else {
      setError("Failed to save changes. Please try again.");
    }
  }

  // count changed fields for Save button label
  const hasConfigChanges = questions.length > 0;
  const hasAgentChanges  = agentReqs.length > 0;
  const hasWorkflow      = steps.some((s) => s.prompt !== undefined || s.description);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Instance</DialogTitle>
          <DialogDescription>
            Adjust configuration, agents, and workflow for{" "}
            <span className="font-semibold text-foreground">{instance.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-0 -mx-6 px-6 divide-y divide-border/40">

          {/* ── General ──────────────────────────────────────────────────── */}
          <div className="py-2">
            <SectionHeader
              icon={<Settings2 size={13} />}
              title="General"
              subtitle="Name and status"
              open={secGeneral}
              onToggle={() => setSecGeneral((v) => !v)}
            />
            {secGeneral && (
              <div className="space-y-3 pb-2 pt-1">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Instance name"
                  />
                </div>
                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">Status</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EDITABLE_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "rounded border px-2.5 py-1 text-xs font-medium transition-all",
                          status === s
                            ? `border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]`
                            : "border-border bg-card text-muted-foreground hover:border-[var(--grace-accent)]/40",
                        )}
                      >
                        <span className={cn(status === s ? "" : STATUS_COLOR[s])}>
                          {STATUS_LABELS[s]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {(status === "running" || status === "failed") && (
                    <p className="text-[10px] text-amber-500/80">
                      Note: "Running" and "Failed" are normally set by the runtime, not manually.
                    </p>
                  )}
                </div>
                {/* Blueprint info (read-only) */}
                <div className="rounded border border-border/50 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>Blueprint</span>
                    <span className="text-foreground/70 font-medium">{instance.blueprintName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steps</span>
                    <span className="text-foreground/70 font-medium">{instance.graphSnapshot.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="text-foreground/70 font-medium">
                      {new Date(instance.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Configuration ─────────────────────────────────────────────── */}
          {hasConfigChanges && (
            <div className="py-2">
              <SectionHeader
                icon={<Wrench size={13} />}
                title="Configuration"
                subtitle={`${questions.length} setting${questions.length !== 1 ? "s" : ""}`}
                open={secConfig}
                onToggle={() => setSecConfig((v) => !v)}
              />
              {secConfig && (
                <div className="space-y-3 pb-2 pt-1">
                  {questions.map((q) => (
                    <QuestionField
                      key={q.id}
                      question={q}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Agents ────────────────────────────────────────────────────── */}
          {hasAgentChanges && (
            <div className="py-2">
              <SectionHeader
                icon={<Users size={13} />}
                title="Agents"
                subtitle={`${agentReqs.length} role${agentReqs.length !== 1 ? "s" : ""}`}
                open={secAgents}
                onToggle={() => setSecAgents((v) => !v)}
              />
              {secAgents && (
                <div className="space-y-4 pb-2 pt-1">
                  {discoveredAgents.length === 0 && (
                    <div className="flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700/70">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5 text-amber-500/60" />
                      <span>No agents discovered yet. Enter identifiers manually or run discovery in Connections.</span>
                    </div>
                  )}
                  {agentReqs.map((req) => {
                    const key = `${req.role}-${req.label}`;
                    return (
                      <AgentRow
                        key={key}
                        label={req.label}
                        role={req.role}
                        description={req.description}
                        capabilities={req.capabilities}
                        required={req.required}
                        currentName={assignments[key] ?? ""}
                        discoveredAgents={discoveredAgents}
                        onChange={(name) => setAgent(key, name)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Workflow (per-step prompt overrides) ──────────────────────── */}
          {hasWorkflow && (
            <div className="py-2">
              <SectionHeader
                icon={<Workflow size={13} />}
                title="Workflow"
                subtitle={`${steps.length} step${steps.length !== 1 ? "s" : ""} — prompt overrides`}
                open={secWorkflow}
                onToggle={() => setSecWorkflow((v) => !v)}
              />
              {secWorkflow && (
                <div className="space-y-3 pb-2 pt-1">
                  <p className="text-[11px] text-muted-foreground/60">
                    Override the prompt for individual steps. Leave blank to use the blueprint default.
                  </p>
                  {steps.map((step, i) => (
                    <div key={step.id} className="space-y-1">
                      <label className="block text-xs font-medium text-foreground">
                        <span className="text-muted-foreground/50 mr-1">Step {i + 1}:</span>
                        {step.name}
                      </label>
                      <textarea
                        rows={2}
                        value={stepPrompts[step.id] ?? ""}
                        onChange={(e) => setPrompt(step.id, e.target.value)}
                        placeholder={step.prompt ? `Default: ${step.prompt.slice(0, 60)}…` : "No default prompt"}
                        className="w-full rounded border border-border bg-card px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[var(--grace-accent)]/50 resize-none font-mono leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        {error && (
          <p className="shrink-0 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2 mt-2">
            {error}
          </p>
        )}

        <div className="shrink-0 flex justify-between gap-2 pt-3 border-t border-border/40 mt-1">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            style={{ background: "var(--grace-accent)", color: "var(--grace-accent-foreground)" }}
            onClick={handleSave}
          >
            {saving ? "Saving…" : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={12} />
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
