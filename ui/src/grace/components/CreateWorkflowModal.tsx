/**
 * CreateWorkflowModal — wizard for creating a new Blueprint skeleton.
 *
 * Steps:
 *   1. Basic Info (name, description, category, workflowType)
 *   2. Steps (add workflow steps by name + description)
 *   3. Agent Config (primary agent label, optional specialist)
 *   4. Review & Create
 *
 * The resulting Blueprint follows the full schema (blueprintTypes.ts) so it
 * can later be edited via ManageBlueprintModal, imported/exported, or
 * migrated to a backend-persisted store.
 *
 * TODO (Phase 4): Replace in-memory service call with POST /api/blueprints.
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { blueprintService } from "../blueprints/blueprintService";
import type { Blueprint, BlueprintStep, WorkflowType } from "../blueprints/blueprintTypes";

type WizardStep = "info" | "steps" | "agents" | "review";
const WIZARD_STEPS: WizardStep[] = ["info", "steps", "agents", "review"];

function stepLabel(s: WizardStep) {
  return { info: "Info", steps: "Steps", agents: "Agents", review: "Review" }[s];
}

interface DraftStep {
  name: string;
  description: string;
}

interface CreateWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (bp: Blueprint) => void;
}

export function CreateWorkflowModal({ open, onClose, onCreated }: CreateWorkflowModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [workflowType, setWorkflowType] = useState<WorkflowType>("single-agent");
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([{ name: "", description: "" }]);
  const [primaryAgent, setPrimaryAgent] = useState("Primary Agent");
  const [specialistAgent, setSpecialistAgent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const currentWizardStep = WIZARD_STEPS[stepIndex];

  function reset() {
    setStepIndex(0);
    setName(""); setDescription(""); setCategory(""); setWorkflowType("single-agent");
    setDraftSteps([{ name: "", description: "" }]);
    setPrimaryAgent("Primary Agent"); setSpecialistAgent("");
    setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function validate(): string | null {
    if (currentWizardStep === "info" && !name.trim()) return "Workflow name is required.";
    if (currentWizardStep === "steps" && draftSteps.every((s) => !s.name.trim())) return "At least one step with a name is required.";
    if (currentWizardStep === "agents" && !primaryAgent.trim()) return "Primary agent label is required.";
    return null;
  }

  function handleNext() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    if (stepIndex < WIZARD_STEPS.length - 1) setStepIndex((i) => i + 1);
    else handleCreate();
  }

  function handleCreate() {
    const now = new Date().toISOString();
    const steps: BlueprintStep[] = draftSteps
      .filter((s) => s.name.trim())
      .map((s, i) => ({
        id: `step-${i + 1}-${Date.now().toString(36)}`,
        name: s.name.trim(),
        description: s.description.trim() || undefined,
        agentRole: "primary",
        skills: [],
        tools: [],
      }));

    const bp: Blueprint = {
      id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: description.trim(),
      version: "1.0.0",
      workflowType,
      ui: { tags: [], category: category.trim() || undefined },
      instanceConfig: { questions: [] },
      agentConfig: {
        primary: primaryAgent.trim()
          ? { role: "primary", label: primaryAgent.trim(), required: true, capabilities: [] }
          : undefined,
        specialists: specialistAgent.trim()
          ? [{ role: "specialist", label: specialistAgent.trim(), required: false, capabilities: [] }]
          : [],
      },
      steps,
      outputs: [],
      createdAt: now,
      updatedAt: now,
    };

    blueprintService.add(bp);
    reset();
    onCreated(bp);
  }

  function addStep() {
    setDraftSteps((prev) => [...prev, { name: "", description: "" }]);
  }

  function removeStep(idx: number) {
    setDraftSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof DraftStep, value: string) {
    setDraftSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  const isLast = stepIndex === WIZARD_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Create a new Blueprint skeleton. You can configure questions, skills, and tools after creation via Manage.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-1 py-1">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                i < stepIndex ? "bg-[var(--grace-accent)] text-white" :
                i === stepIndex ? "border-2 border-[var(--grace-accent)] text-[var(--grace-accent)]" :
                "border border-border text-muted-foreground/50"
              )}>{i + 1}</div>
              <span className={cn("text-xs", i === stepIndex ? "font-medium text-foreground" : "text-muted-foreground/50")}>{stepLabel(s)}</span>
              {i < WIZARD_STEPS.length - 1 && <div className="mx-1 h-px w-5 bg-border" />}
            </div>
          ))}
        </div>

        <div className="min-h-40 space-y-3">
          {currentWizardStep === "info" && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead Qualifier" autoFocus />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this workflow do?" className="min-h-20 resize-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Category</label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Research" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Workflow type</label>
                  <select value={workflowType} onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}
                    className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]">
                    <option value="single-agent">Single Agent</option>
                    <option value="multi-agent">Multi-Agent</option>
                    <option value="swarm">Swarm</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {currentWizardStep === "steps" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Define the steps in this workflow. You can add skills and tools per step after creation.</p>
              {draftSteps.map((s, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] font-bold text-[var(--grace-accent)]/60 w-5 mt-2 text-right shrink-0">{i + 1}</span>
                  <div className="flex-1 space-y-1">
                    <Input value={s.name} onChange={(e) => updateStep(i, "name", e.target.value)}
                      placeholder="Step name" className="text-sm" />
                    <Input value={s.description} onChange={(e) => updateStep(i, "description", e.target.value)}
                      placeholder="Description (optional)" className="text-xs" />
                  </div>
                  {draftSteps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)}
                      className="mt-1.5 text-muted-foreground/50 hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addStep}
                className="flex items-center gap-1.5 text-xs text-[var(--grace-accent)] hover:opacity-80 transition-opacity">
                <Plus size={12} /> Add step
              </button>
            </div>
          )}

          {currentWizardStep === "agents" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Define agent roles required for this workflow.</p>
              <div className="space-y-1">
                <label className="text-sm font-medium">Primary agent label <span className="text-destructive">*</span></label>
                <Input value={primaryAgent} onChange={(e) => setPrimaryAgent(e.target.value)} placeholder="e.g. Research Agent" />
                <p className="text-[10px] text-muted-foreground/60">The main agent that executes this workflow.</p>
              </div>
              {workflowType !== "single-agent" && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Specialist agent label (optional)</label>
                  <Input value={specialistAgent} onChange={(e) => setSpecialistAgent(e.target.value)} placeholder="e.g. Data Analyst" />
                  <p className="text-[10px] text-muted-foreground/60">An optional specialist agent for multi-agent workflows.</p>
                </div>
              )}
            </div>
          )}

          {currentWizardStep === "review" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Review before creating.</p>
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{workflowType}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{category || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Steps</span><span className="font-medium">{draftSteps.filter((s) => s.name.trim()).length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Primary agent</span><span className="font-medium">{primaryAgent}</span></div>
                {specialistAgent && <div className="flex justify-between"><span className="text-muted-foreground">Specialist</span><span className="font-medium">{specialistAgent}</span></div>}
              </div>
              <p className="text-[10px] text-muted-foreground/60">After creation, use Manage to add questions, skills, tools, and prompts per step.</p>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded px-3 py-2">{error}</p>}

        <div className="flex justify-between pt-1">
          <Button variant="outline" size="sm" onClick={stepIndex === 0 ? handleClose : () => { setError(null); setStepIndex((i) => i - 1); }}>
            {stepIndex === 0 ? "Cancel" : "Back"}
          </Button>
          <Button size="sm" style={{ background: "var(--grace-accent)", color: "var(--grace-accent-foreground)" }} onClick={handleNext}>
            {isLast ? "Create Workflow" : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
