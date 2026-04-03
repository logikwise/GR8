/**
 * Skills — Phase 6
 *
 * Fully persisted via skillService (grace.skills.v1).
 * Supports: create new skeleton, duplicate, delete with confirm.
 * All changes survive refresh and deep-linking.
 */

import { useState, useMemo, useCallback } from "react";
import {
  Zap, Plus, Upload, GitBranch, Globe, Package,
  Search, LayoutGrid, List, Trash2, X, Copy,
} from "lucide-react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IdBadge } from "../components/IdBadge";
import { cn } from "@/lib/utils";
import { skillService } from "../skills/skillService";
import type { SkillDefinition } from "../skills/skillTypes";

const IMPORT_SOURCES = [
  { id: "workspace", label: "Connected Workspace", description: "Import skills from a connected workspace.",             icon: <Zap size={15} /> },
  { id: "upload",    label: "Upload / Import File",  description: "Upload a skill package (.json, .yaml, .zip).",        icon: <Upload size={15} /> },
  { id: "git",       label: "Import from Git",       description: "Pull a skill directly from a Git repository.",        icon: <GitBranch size={15} /> },
  { id: "url",       label: "Import from URL",       description: "Fetch a skill definition from any public endpoint.",  icon: <Globe size={15} /> },
  { id: "skillssh",  label: "Import from skills.sh", description: "Browse and install verified community skills.",       icon: <Package size={15} /> },
];

function statusColor(status?: string) {
  switch (status) {
    case "active":     return "bg-emerald-500/10 text-emerald-400";
    case "deprecated": return "bg-amber-500/10 text-amber-400";
    default:           return "bg-muted/60 text-muted-foreground";
  }
}

function SkillCard({
  skill, onDelete, onDuplicate,
}: { skill: SkillDefinition; onDelete: () => void; onDuplicate: () => void }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)]/40 transition-colors">
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onDuplicate}
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground/30 hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-all"
          title="Duplicate skill">
          <Copy size={11} />
        </button>
        <button type="button" onClick={onDelete}
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all"
          title="Remove skill">
          <Trash2 size={11} />
        </button>
      </div>
      <div className="flex items-start gap-3 pr-14">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)]">
          <Zap size={14} className="text-[var(--grace-accent)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{skill.name}</span>
            <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground font-mono">v{skill.version}</span>
            {skill.status && (
              <span className={cn("text-[10px] rounded px-1.5 py-0.5", statusColor(skill.status))}>{skill.status}</span>
            )}
            {skill.source && (
              <span className="text-[10px] rounded bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[var(--grace-accent)]">{skill.source}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{skill.description || <em className="opacity-40">No description</em>}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {skill.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[9px] rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-muted-foreground">{tag}</span>
            ))}
            {skill.category && (
              <span className="text-[9px] rounded bg-muted/40 px-1.5 py-0.5 text-muted-foreground/60">{skill.category}</span>
            )}
            <IdBadge id={skill.id} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillRow({
  skill, onDelete, onDuplicate,
}: { skill: SkillDefinition; onDelete: () => void; onDuplicate: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 hover:border-[var(--grace-accent)]/40 transition-colors">
      <Zap size={13} className="text-[var(--grace-accent)] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{skill.name}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">v{skill.version}</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{skill.description || "—"}</span>
      </div>
      <IdBadge id={skill.id} />
      {skill.status && (
        <span className={cn("text-[10px] rounded px-1.5 py-0.5 shrink-0", statusColor(skill.status))}>{skill.status}</span>
      )}
      <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground shrink-0">{skill.source ?? "—"}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onDuplicate}
          className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/30 hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-all shrink-0">
          <Copy size={12} />
        </button>
        <button type="button" onClick={onDelete}
          className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Create New Modal (minimal inline) ─────────────────────────────────────────

function CreateSkillModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, category: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-4">Create New Skill</h2>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onCreate(name.trim(), category); }}
              placeholder="e.g. Data Extraction"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Research"
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded border border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button type="button"
            disabled={!name.trim()}
            onClick={() => name.trim() && onCreate(name.trim(), category)}
            className="rounded bg-[var(--grace-accent)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function GraceSkills() {
  const [refreshKey, setRefreshKey] = useState(0);
  const skills = useMemo(() => skillService.getAll(), [refreshKey]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteTarget, setDeleteTarget] = useState<SkillDefinition | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return skills;
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      (s.category ?? "").toLowerCase().includes(q)
    );
  }, [skills, search]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function handleDelete(skill: SkillDefinition) {
    skillService.remove(skill.id);
    setDeleteTarget(null);
    refresh();
  }

  function handleDuplicate(skill: SkillDefinition) {
    skillService.duplicate(skill.id);
    refresh();
  }

  function handleCreate(name: string, category: string) {
    const skeleton = skillService.createSkeleton(name, category);
    skillService.add(skeleton);
    setShowCreate(false);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skills extend agent capabilities. Create, import, and manage skills for your workspace.
        </p>
      </div>

      {/* Registered skills */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/50">Registered Skills</p>
          <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">{skills.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills…"
                className="w-40 rounded border border-border bg-muted/20 py-1 pl-7 pr-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="flex rounded border border-border overflow-hidden">
              <button type="button" onClick={() => setViewMode("card")}
                className={cn("flex items-center justify-center w-7 h-7", viewMode === "card" ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]" : "text-muted-foreground/50 hover:text-foreground")}>
                <LayoutGrid size={12} />
              </button>
              <button type="button" onClick={() => setViewMode("list")}
                className={cn("flex items-center justify-center w-7 h-7 border-l border-border", viewMode === "list" ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)]" : "text-muted-foreground/50 hover:text-foreground")}>
                <List size={12} />
              </button>
            </div>
            <button type="button" onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)]/40 bg-[var(--grace-accent-muted)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]/80 transition-colors">
              <Plus size={11} />
              New
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-xs text-muted-foreground/60">
              {search ? "No skills match your search." : "No skills registered yet. Create or import one below."}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onDelete={() => setDeleteTarget(skill)}
                onDuplicate={() => handleDuplicate(skill)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                onDelete={() => setDeleteTarget(skill)}
                onDuplicate={() => handleDuplicate(skill)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Import sources */}
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Import Sources</p>
        <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">coming soon</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMPORT_SOURCES.map((src) => (
          <div key={src.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 opacity-40 cursor-not-allowed"
            title="Not yet available">
            <div className="mt-0.5 shrink-0 text-muted-foreground/60">{src.icon}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">{src.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/60 leading-snug">{src.description}</div>
            </div>
          </div>
        ))}
      </div>

      <CreateSkillModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Skill"
        description={`Remove "${deleteTarget?.name ?? "this skill"}" from the registry? This is saved locally and will persist.`}
        confirmLabel="Remove"
        variant="warning"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
