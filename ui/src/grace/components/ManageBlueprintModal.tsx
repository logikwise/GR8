/**
 * ManageBlueprintModal — Manage actions for a Blueprint.
 * Available ONLY from the Workflows/library context, NOT from Studio preview.
 *
 * Tabs: Overview | Edit | Agents | Export | Syntax Check
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
import { cn } from "@/lib/utils";
import { blueprintService } from "../blueprints/blueprintService";
import type { Blueprint, AgentRequirement } from "../blueprints/blueprintTypes";
import {
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  CircleDot,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ManageTab = "overview" | "edit" | "agents" | "export" | "syntax";

interface ManageBlueprintModalProps {
  blueprint: Blueprint;
  open: boolean;
  onClose: () => void;
  onUpdated: (bp: Blueprint) => void;
}

function SyntaxResult({ blueprint }: { blueprint: Blueprint }) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!blueprint.name?.trim()) errors.push("Blueprint name is required.");
  if (!blueprint.id?.trim()) errors.push("Blueprint id is required.");
  if (!blueprint.version?.trim()) warnings.push("Version is not set.");
  if (blueprint.steps.length === 0) warnings.push("Blueprint has no steps.");
  if (!blueprint.agentConfig.primary) warnings.push("No primary agent defined.");
  blueprint.steps.forEach((s, i) => {
    if (!s.name?.trim()) errors.push(`Step ${i + 1} has no name.`);
  });

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
        <CheckCircle size={16} />
        Blueprint syntax is valid. No errors found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {errors.map((e, i) => (
        <div key={i} className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />{e}
        </div>
      ))}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />{w}
        </div>
      ))}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/* ── Capability chip tag input ─────────────────────────────────────────── */
function CapabilityEditor({
  value,
  onChange,
  placeholder = "e.g. code-generation, planning",
}: {
  value: string[];
  onChange: (caps: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const next = Array.from(new Set([...value, ...parts]));
    onChange(next);
    setInput("");
  }

  function remove(cap: string) {
    onChange(value.filter((c) => c !== cap));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 min-h-6">
        {value.map((cap) => (
          <span
            key={cap}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--grace-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--grace-accent)]"
          >
            {cap}
            <button
              type="button"
              onClick={() => remove(cap)}
              className="hover:text-destructive transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-[10px] text-muted-foreground/50 py-0.5">No capabilities defined</span>
        )}
      </div>
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button
          type="button"
          onClick={commit}
          className="flex items-center justify-center w-7 h-7 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs shrink-0"
          title="Add capability"
        >
          <Plus size={12} />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/60">Comma-separate or press Enter to add multiple at once.</p>
    </div>
  );
}

/* ── Single agent requirement editor card ──────────────────────────────── */
function AgentCard({
  agent,
  onChange,
  onRemove,
  isPrimary,
}: {
  agent: AgentRequirement;
  onChange: (a: AgentRequirement) => void;
  onRemove?: () => void;
  isPrimary: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
        <CircleDot size={11} className={isPrimary ? "text-[var(--grace-accent)]" : "text-muted-foreground/60"} />
        <span className="flex-1 text-xs font-medium truncate">
          {agent.label || (isPrimary ? "Primary Agent" : "Specialist")}
        </span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground uppercase tracking-wide">
          {isPrimary ? "primary" : "specialist"}
        </span>
        {!isPrimary && !agent.required && (
          <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] text-muted-foreground/60 uppercase tracking-wide">
            optional
          </span>
        )}
        {!isPrimary && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground/40 hover:text-destructive transition-colors"
            title="Remove specialist"
          >
            <Trash2 size={12} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="text-muted-foreground/40 hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3">
          {/* Label */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Label
            </label>
            <Input
              className="h-7 text-xs"
              value={agent.label}
              onChange={(e) => onChange({ ...agent, label: e.target.value })}
              placeholder={isPrimary ? "e.g. Primary Agent" : "e.g. Research Specialist"}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Description
            </label>
            <Textarea
              className="min-h-14 text-xs resize-none"
              value={agent.description ?? ""}
              onChange={(e) => onChange({ ...agent, description: e.target.value })}
              placeholder="Describe what this agent is responsible for…"
            />
          </div>

          {/* Required (specialists only) */}
          {!isPrimary && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agent.required}
                onChange={(e) => onChange({ ...agent, required: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-muted-foreground">Required (cannot run without this agent)</span>
            </label>
          )}

          {/* Capabilities */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Capability Requirements
            </label>
            <CapabilityEditor
              value={agent.capabilities ?? []}
              onChange={(caps) => onChange({ ...agent, capabilities: caps })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Agents tab ─────────────────────────────────────────────────────────── */
function AgentsTab({
  draft,
  setDraft,
}: {
  draft: Blueprint;
  setDraft: React.Dispatch<React.SetStateAction<Blueprint>>;
}) {
  function setPrimary(a: AgentRequirement) {
    setDraft((d) => ({ ...d, agentConfig: { ...d.agentConfig, primary: a } }));
  }

  function setSpecialist(idx: number, a: AgentRequirement) {
    setDraft((d) => {
      const specs = [...(d.agentConfig.specialists ?? [])];
      specs[idx] = a;
      return { ...d, agentConfig: { ...d.agentConfig, specialists: specs } };
    });
  }

  function removeSpecialist(idx: number) {
    setDraft((d) => {
      const specs = [...(d.agentConfig.specialists ?? [])];
      specs.splice(idx, 1);
      return { ...d, agentConfig: { ...d.agentConfig, specialists: specs } };
    });
  }

  function addSpecialist() {
    const newSpec: AgentRequirement = {
      role: "specialist",
      label: "New Specialist",
      description: "",
      required: false,
      capabilities: [],
    };
    setDraft((d) => ({
      ...d,
      agentConfig: {
        ...d.agentConfig,
        specialists: [...(d.agentConfig.specialists ?? []), newSpec],
      },
    }));
  }

  function initPrimary() {
    setPrimary({ role: "primary", label: "Primary Agent", required: true, capabilities: [] });
  }

  return (
    <div className="space-y-3 py-1">
      {/* Primary */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Primary Agent</p>
        </div>
        {draft.agentConfig.primary ? (
          <AgentCard
            agent={draft.agentConfig.primary}
            onChange={setPrimary}
            isPrimary
          />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 p-4">
            <p className="text-xs text-muted-foreground">No primary agent defined.</p>
            <Button variant="outline" size="sm" onClick={initPrimary}>
              <Plus size={12} className="mr-1" /> Add Primary Agent
            </Button>
          </div>
        )}
      </div>

      {/* Specialists */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Specialists</p>
          <button
            type="button"
            onClick={addSpecialist}
            className="flex items-center gap-1 text-[10px] text-[var(--grace-accent)] hover:underline"
          >
            <Plus size={10} /> Add Specialist
          </button>
        </div>

        {(draft.agentConfig.specialists ?? []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 py-2">
            No specialist agents defined. Click "Add Specialist" to define additional agent roles.
          </p>
        ) : (
          <div className="space-y-2">
            {(draft.agentConfig.specialists ?? []).map((sp, idx) => (
              <AgentCard
                key={idx}
                agent={sp}
                onChange={(a) => setSpecialist(idx, a)}
                onRemove={() => removeSpecialist(idx)}
                isPrimary={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Steps using agent roles */}
      {draft.steps.some((s) => s.agentRole) && (
        <div className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Step → Role Assignments</p>
          {draft.steps.filter((s) => s.agentRole).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--grace-accent)]/50 shrink-0" />
              <span className="text-foreground truncate">{s.name}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-[var(--grace-accent)]/80 truncate">{s.agentRole}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ManageBlueprintModal({ blueprint: initialBlueprint, open, onClose, onUpdated }: ManageBlueprintModalProps) {
  const [tab, setTab] = useState<ManageTab>("overview");
  const [draft, setDraft] = useState<Blueprint>(initialBlueprint);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const TABS: { id: ManageTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "edit", label: "Edit" },
    { id: "agents", label: "Agents" },
    { id: "export", label: "Export" },
    { id: "syntax", label: "Syntax" },
  ];

  function handleSave() {
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    blueprintService.add(updated);
    setSaved(true);
    onUpdated(updated);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDuplicate() {
    const dup: Blueprint = {
      ...draft,
      id: `bp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${draft.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    blueprintService.add(dup);
    onUpdated(dup);
    onClose();
  }

  const isEditTab = tab === "edit" || tab === "agents";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage Blueprint</DialogTitle>
          <DialogDescription className="truncate">{initialBlueprint.name}</DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border/60 -mx-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-[var(--grace-accent)] text-[var(--grace-accent)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-48 max-h-[60vh] overflow-y-auto">
          {tab === "overview" && (
            <div className="space-y-2 py-1">
              <MetaRow label="Name" value={draft.name} />
              <MetaRow label="ID" value={draft.id} />
              <MetaRow label="Version" value={draft.version} />
              <MetaRow label="Workflow type" value={draft.workflowType} />
              <MetaRow label="Category" value={draft.ui?.category} />
              <MetaRow label="Steps" value={String(draft.steps.length)} />
              <MetaRow label="Agent" value={draft.agentConfig.primary?.label} />
              <MetaRow
                label="Specialists"
                value={
                  (draft.agentConfig.specialists?.length ?? 0) > 0
                    ? draft.agentConfig.specialists!.map((s) => s.label).join(", ")
                    : undefined
                }
              />
              <MetaRow label="Tags" value={draft.ui?.tags?.join(", ")} />
              <MetaRow label="Created" value={draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : undefined} />
              <MetaRow label="Updated" value={draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : undefined} />
              {draft.description && (
                <div className="pt-2 text-xs text-muted-foreground border-t border-border/60">{draft.description}</div>
              )}
              <div className="flex gap-2 pt-3 border-t border-border/60">
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  Duplicate Blueprint
                </Button>
              </div>
            </div>
          )}

          {tab === "edit" && (
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  className="min-h-20 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Version</label>
                  <Input value={draft.version} onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Input
                    value={draft.ui?.category ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, ui: { ...d.ui, category: e.target.value } }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated)</label>
                <Input
                  value={draft.ui?.tags?.join(", ") ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      ui: { ...d.ui, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Workflow Type</label>
                <select
                  value={draft.workflowType}
                  onChange={(e) => setDraft((d) => ({ ...d, workflowType: e.target.value as Blueprint["workflowType"] }))}
                  className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
                >
                  <option value="single-agent">Single Agent</option>
                  <option value="multi-agent">Multi-Agent</option>
                  <option value="swarm">Swarm</option>
                </select>
              </div>
            </div>
          )}

          {tab === "agents" && (
            <AgentsTab draft={draft} setDraft={setDraft} />
          )}

          {tab === "export" && (
            <div className="py-1 space-y-2">
              <p className="text-xs text-muted-foreground">Blueprint JSON — copy and save as a .json file.</p>
              <div className="relative">
                <pre className="rounded-lg border border-border bg-muted/30 p-3 text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-64">
                  {JSON.stringify(draft, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <><Check size={10} className="text-emerald-500" /> Copied</> : <><Copy size={10} /> Copy</>}
                </button>
              </div>
            </div>
          )}

          {tab === "syntax" && (
            <div className="py-2 space-y-3">
              <p className="text-xs text-muted-foreground">Validates blueprint structure and required fields.</p>
              <SyntaxResult blueprint={draft} />
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 pt-1 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          {isEditTab && (
            <Button
              size="sm"
              style={{ background: "var(--grace-accent)", color: "var(--grace-accent-foreground)" }}
              onClick={handleSave}
            >
              {saved ? "Saved!" : "Save Changes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
