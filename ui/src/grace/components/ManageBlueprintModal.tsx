/**
 * ManageBlueprintModal — Manage actions for a Blueprint.
 * Available ONLY from the Workflows/library context, NOT from Studio preview.
 *
 * Tabs: Overview | Edit | Export | Syntax Check
 *
 * TODO (Phase 4): Add versioning tab and git-based export.
 * TODO (Phase 4): Connect Edit save to backend API (PATCH /api/blueprints/:id).
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
import type { Blueprint } from "../blueprints/blueprintTypes";
import { CheckCircle, AlertCircle, Copy, Check } from "lucide-react";

type ManageTab = "overview" | "edit" | "export" | "syntax";

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

export function ManageBlueprintModal({ blueprint: initialBlueprint, open, onClose, onUpdated }: ManageBlueprintModalProps) {
  const [tab, setTab] = useState<ManageTab>("overview");
  const [draft, setDraft] = useState<Blueprint>(initialBlueprint);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const TABS: { id: ManageTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "edit", label: "Edit" },
    { id: "export", label: "Export" },
    { id: "syntax", label: "Syntax Check" },
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
                "px-4 py-2 text-xs font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-[var(--grace-accent)] text-[var(--grace-accent)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-48 max-h-96 overflow-y-auto">
          {tab === "overview" && (
            <div className="space-y-2 py-1">
              <MetaRow label="Name" value={draft.name} />
              <MetaRow label="ID" value={draft.id} />
              <MetaRow label="Version" value={draft.version} />
              <MetaRow label="Workflow type" value={draft.workflowType} />
              <MetaRow label="Category" value={draft.ui?.category} />
              <MetaRow label="Steps" value={String(draft.steps.length)} />
              <MetaRow label="Agent" value={draft.agentConfig.primary?.label} />
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
          {tab === "edit" && (
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
