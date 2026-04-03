/**
 * CreateInstanceModal — wizard for creating an Instance from a Blueprint.
 *
 * Steps:
 *   1. Name the instance
 *   2. Answer Blueprint-configured questions
 *   3. Assign required agents
 *
 * Modular: the form logic is independent of how it's presented (modal, drawer, panel).
 * TODO (Phase 3): Replace the agent text-input with a real agent-picker
 * connected to GET /api/agents.
 */

import { useState } from "react";
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
import type { Blueprint, BlueprintQuestion, AgentRequirement } from "../blueprints/blueprintTypes";
import type { AnsweredQuestion, AgentAssignment } from "../instances/instanceTypes";
import { instanceService } from "../instances/instanceService";
import type { CreateInstancePayload } from "../instances/instanceService";
import type { Instance } from "../instances/instanceTypes";

type Step = "name" | "questions" | "agents" | "confirm";

const STEPS: Step[] = ["name", "questions", "agents", "confirm"];

function stepLabel(step: Step) {
  const map: Record<Step, string> = {
    name: "Name",
    questions: "Configure",
    agents: "Agents",
    confirm: "Review",
  };
  return map[step];
}

interface CreateInstanceModalProps {
  blueprint: Blueprint;
  open: boolean;
  onClose: () => void;
  onCreated: (instance: Instance) => void;
}

export function CreateInstanceModal({ blueprint, open, onClose, onCreated }: CreateInstanceModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [instanceName, setInstanceName] = useState(`${blueprint.name} — Instance`);
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>(() => {
    const defaults: Record<string, string | number | boolean> = {};
    for (const q of blueprint.instanceConfig.questions) {
      if (q.defaultValue !== undefined) defaults[q.id] = q.defaultValue;
    }
    return defaults;
  });
  const [agentAssignments, setAgentAssignments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const hasQuestions = blueprint.instanceConfig.questions.length > 0;
  const allAgentReqs: AgentRequirement[] = [
    ...(blueprint.agentConfig.primary ? [blueprint.agentConfig.primary] : []),
    ...(blueprint.agentConfig.specialists ?? []),
  ];
  const hasAgents = allAgentReqs.length > 0;

  const steps: Step[] = STEPS.filter((s) => {
    if (s === "questions" && !hasQuestions) return false;
    if (s === "agents" && !hasAgents) return false;
    return true;
  });

  const currentStep = steps[stepIndex];

  function reset() {
    setStepIndex(0);
    setInstanceName(`${blueprint.name} — Instance`);
    const defaults: Record<string, string | number | boolean> = {};
    for (const q of blueprint.instanceConfig.questions) {
      if (q.defaultValue !== undefined) defaults[q.id] = q.defaultValue;
    }
    setAnswers(defaults);
    setAgentAssignments({});
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validateCurrent(): string | null {
    if (currentStep === "name") {
      if (!instanceName.trim()) return "Instance name is required.";
    }
    if (currentStep === "questions") {
      for (const q of blueprint.instanceConfig.questions) {
        if (q.required && (answers[q.id] === undefined || answers[q.id] === "")) {
          return `"${q.label}" is required.`;
        }
      }
    }
    if (currentStep === "agents") {
      for (const req of allAgentReqs) {
        if (req.required && !agentAssignments[req.role + "-" + req.label]?.trim()) {
          return `Agent "${req.label}" is required.`;
        }
      }
    }
    return null;
  }

  function handleNext() {
    const err = validateCurrent();
    if (err) { setError(err); return; }
    setError(null);
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleCreate();
    }
  }

  function handleBack() {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleCreate() {
    const configSnapshot: AnsweredQuestion[] = blueprint.instanceConfig.questions.map((q) => ({
      questionId: q.id,
      label: q.label,
      value: answers[q.id] ?? "",
    }));

    const assignments: AgentAssignment[] = allAgentReqs
      .filter((req) => agentAssignments[req.role + "-" + req.label]?.trim())
      .map((req) => {
        const name = agentAssignments[req.role + "-" + req.label].trim();
        return {
          role: req.role,
          label: req.label,
          agentId: name.toLowerCase().replace(/\s+/g, "-"),
          agentName: name,
        };
      });

    const payload: CreateInstancePayload = {
      name: instanceName.trim(),
      blueprintId: blueprint.id,
      blueprintName: blueprint.name,
      blueprintVersionSource: blueprint.version,
      status: "draft",
      graphSnapshot: blueprint.steps.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        prompt: s.prompt,
        agentRole: s.agentRole,
      })),
      configSnapshot,
      agentAssignments: assignments,
      instanceMemory: {},
    };

    const created = instanceService.create(payload);
    reset();
    onCreated(created);
  }

  function setAnswer(qid: string, value: string | number | boolean) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function setAgent(key: string, value: string) {
    setAgentAssignments((prev) => ({ ...prev, [key]: value }));
  }

  const isLastStep = stepIndex === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Instance</DialogTitle>
          <DialogDescription>
            Creating an instance of <span className="font-medium text-foreground">{blueprint.name}</span>.
            Instances are independent — Blueprint changes will not affect this Instance after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1 py-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                  i < stepIndex
                    ? "bg-[var(--grace-accent)] text-white"
                    : i === stepIndex
                    ? "border-2 border-[var(--grace-accent)] text-[var(--grace-accent)]"
                    : "border border-border text-muted-foreground/50"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-xs",
                  i === stepIndex ? "font-medium text-foreground" : "text-muted-foreground/60"
                )}
              >
                {stepLabel(s)}
              </span>
              {i < steps.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
            </div>
          ))}
        </div>

        <div className="min-h-36">
          {currentStep === "name" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Instance name <span className="text-destructive">*</span>
              </label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="My Instance"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Give this Instance a descriptive name so you can identify it in the Instances list.
              </p>
            </div>
          )}

          {currentStep === "questions" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                These settings will be embedded in the Instance snapshot.
              </p>
              {blueprint.instanceConfig.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              ))}
            </div>
          )}

          {currentStep === "agents" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Assign agents to the required roles for this Instance.
                {/* TODO (Phase 3): Replace with real agent-picker from GET /api/agents */}
              </p>
              {allAgentReqs.map((req) => {
                const key = req.role + "-" + req.label;
                return (
                  <div key={key} className="space-y-1.5">
                    <label className="block text-sm font-medium text-foreground">
                      {req.label}
                      {req.required && <span className="text-destructive ml-0.5">*</span>}
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground uppercase">
                        {req.role}
                      </span>
                    </label>
                    {req.description && (
                      <p className="text-xs text-muted-foreground">{req.description}</p>
                    )}
                    <Input
                      value={agentAssignments[key] ?? ""}
                      onChange={(e) => setAgent(key, e.target.value)}
                      placeholder="Agent name or identifier"
                    />
                    {req.capabilities && req.capabilities.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/70">
                        Recommended capabilities: {req.capabilities.join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentStep === "confirm" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Review your Instance configuration before creating.
              </p>
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{instanceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blueprint</span>
                  <span className="font-medium text-foreground">{blueprint.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Steps</span>
                  <span className="font-medium text-foreground">{blueprint.steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-foreground">Draft</span>
                </div>
                {blueprint.instanceConfig.questions.length > 0 && (
                  <div className="pt-1 border-t border-border/60 space-y-1">
                    <span className="text-muted-foreground">Configured settings</span>
                    {blueprint.instanceConfig.questions.map((q) => {
                      const val = answers[q.id];
                      return (
                        <div key={q.id} className="flex justify-between pl-2">
                          <span className="text-muted-foreground/80 truncate max-w-[55%]">{q.label}</span>
                          <span className="font-medium text-foreground">
                            {val !== undefined ? String(val) : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {allAgentReqs.length > 0 && (
                  <div className="pt-1 border-t border-border/60 space-y-1">
                    <span className="text-muted-foreground">Agent assignments</span>
                    {allAgentReqs.map((req) => {
                      const key = req.role + "-" + req.label;
                      return (
                        <div key={key} className="flex justify-between pl-2">
                          <span className="text-muted-foreground/80">{req.label}</span>
                          <span className="font-medium text-foreground">
                            {agentAssignments[key]?.trim() || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                After creation, this Instance will appear in your Instances list with status "Draft". Open it in Studio to configure and eventually run it.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-between gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={stepIndex === 0 ? handleClose : handleBack}>
            {stepIndex === 0 ? "Cancel" : "Back"}
          </Button>
          <Button
            size="sm"
            style={{ background: "var(--grace-accent)", color: "var(--grace-accent-foreground)" }}
            onClick={handleNext}
          >
            {isLastStep ? "Create Instance" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: BlueprintQuestion;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {question.label}
        {question.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {question.hint && <p className="text-xs text-muted-foreground">{question.hint}</p>}

      {question.type === "boolean" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={value === true}
            onClick={() => onChange(value !== true)}
            className={cn(
              "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors",
              value === true ? "bg-[var(--grace-accent)]" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
                value === true ? "translate-x-4" : "translate-x-1"
              )}
            />
          </button>
          <span className="text-xs text-muted-foreground">
            {value === true ? "Enabled" : "Disabled"}
          </span>
        </div>
      )}

      {question.type === "select" && question.options && (
        <div className="flex flex-wrap gap-2">
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "rounded border px-3 py-1 text-xs font-medium transition-colors",
                String(value) === opt
                  ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]"
                  : "border-border text-muted-foreground hover:border-[var(--grace-accent)]/40"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "text" && (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      )}

      {question.type === "number" && (
        <Input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={question.placeholder}
        />
      )}
    </div>
  );
}

// Re-export payload type for consumers
export type { CreateInstancePayload };
