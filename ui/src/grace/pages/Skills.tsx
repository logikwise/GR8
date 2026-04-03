/**
 * Skills — Phase 5
 *
 * Improvements:
 *  - Search/filter/view toggle for registered skills
 *  - Sample registered skill entries
 *  - Delete with ConfirmDialog
 *  - Import source cards updated (Phase 6 label)
 *
 * TODO (Phase 6): Replace mock data with GET /api/company-skills.
 */

import { useState, useMemo } from "react";
import {
  Zap, ArrowRight, Plus, Upload, GitBranch, Globe, Package,
  Search, LayoutGrid, List, Trash2, X,
} from "lucide-react";
import { Link } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IdBadge } from "../components/IdBadge";
import { cn } from "@/lib/utils";

interface SkillEntry {
  id: string;
  name: string;
  description: string;
  version: string;
  source: string;
  capabilities: string[];
  createdAt: string;
}

const SAMPLE_SKILLS: SkillEntry[] = [
  {
    id: "skill-web-search",
    name: "Web Search",
    description: "Search the web and return structured results. Supports query filters, date ranges, and source restrictions.",
    version: "1.2.0",
    source: "built-in",
    capabilities: ["search", "scrape", "summarise"],
    createdAt: "2024-11-01",
  },
  {
    id: "skill-code-review",
    name: "Code Review",
    description: "Analyse source code for bugs, style issues, and security vulnerabilities.",
    version: "0.9.1",
    source: "workspace",
    capabilities: ["analyse", "diff", "suggest"],
    createdAt: "2024-12-10",
  },
  {
    id: "skill-doc-summary",
    name: "Document Summary",
    description: "Summarise long-form documents into structured bullet points or executive summaries.",
    version: "1.0.0",
    source: "built-in",
    capabilities: ["summarise", "extract", "classify"],
    createdAt: "2025-01-05",
  },
];

const IMPORT_SOURCES = [
  { id: "workspace", label: "Connected Workspace", description: "Import skills from a connected workspace.",             icon: <Zap size={15} /> },
  { id: "create",    label: "Create New",           description: "Define a new skill from scratch.",                     icon: <Plus size={15} /> },
  { id: "upload",    label: "Upload / Import File",  description: "Upload a skill package (.json, .yaml, .zip).",        icon: <Upload size={15} /> },
  { id: "git",       label: "Import from Git",       description: "Pull a skill directly from a Git repository.",        icon: <GitBranch size={15} /> },
  { id: "url",       label: "Import from URL",       description: "Fetch a skill definition from any public endpoint.",  icon: <Globe size={15} /> },
  { id: "skillssh",  label: "Import from skills.sh", description: "Browse and install verified community skills.",       icon: <Package size={15} /> },
];

function SkillCard({ skill, onDelete }: { skill: SkillEntry; onDelete: () => void }) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)]/40 transition-colors">
      <button type="button" onClick={onDelete}
        className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
        title="Remove skill">
        <Trash2 size={11} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)]">
          <Zap size={14} className="text-[var(--grace-accent)]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{skill.name}</span>
            <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground font-mono">v{skill.version}</span>
            <span className="text-[10px] rounded bg-[var(--grace-accent-muted)] px-1.5 py-0.5 text-[var(--grace-accent)]">{skill.source}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{skill.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {skill.capabilities.map((cap) => (
              <span key={cap} className="text-[9px] rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-muted-foreground">{cap}</span>
            ))}
            <IdBadge id={skill.id} className="ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillRow({ skill, onDelete }: { skill: SkillEntry; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 hover:border-[var(--grace-accent)]/40 transition-colors">
      <Zap size={13} className="text-[var(--grace-accent)] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{skill.name}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">v{skill.version}</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{skill.description}</span>
      </div>
      <IdBadge id={skill.id} />
      <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground shrink-0">{skill.source}</span>
      <button type="button" onClick={onDelete}
        className="flex items-center justify-center w-7 h-7 rounded text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function GraceSkills() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? selectedCompanyId;

  const [skills, setSkills] = useState<SkillEntry[]>(SAMPLE_SKILLS);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [deleteTarget, setDeleteTarget] = useState<SkillEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return skills;
    return skills.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.capabilities.some((c) => c.includes(q))
    );
  }, [skills, search]);

  function handleDelete(skill: SkillEntry) {
    setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    setDeleteTarget(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skills extend agent capabilities. Browse, create, and import skills for your workspace.
        </p>
      </div>

      {prefix && (
        <Link
          to={`/${prefix}/skills`}
          className="mb-6 flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-[var(--grace-accent)]" />
            <div>
              <div className="text-sm font-medium group-hover:text-[var(--grace-accent)]">
                {selectedCompany?.name ?? "Workspace"} Skills
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Manage skills for this workspace</div>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-[var(--grace-accent)]" />
        </Link>
      )}

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
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-xs text-muted-foreground/60">No skills match your search.</p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onDelete={() => setDeleteTarget(skill)} />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((skill) => (
              <SkillRow key={skill.id} skill={skill} onDelete={() => setDeleteTarget(skill)} />
            ))}
          </div>
        )}
      </div>

      {/* Import sources */}
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Import Sources</p>
        <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">Phase 6</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMPORT_SOURCES.map((src) => (
          <div key={src.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 opacity-50 cursor-not-allowed"
            title="Coming in Phase 6">
            <div className="mt-0.5 shrink-0 text-muted-foreground/60">{src.icon}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">{src.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/60 leading-snug">{src.description}</div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove Skill"
        description={`Remove "${deleteTarget?.name ?? "this skill"}" from the registry? (Local change in Phase 5 — does not affect the backend.)`}
        confirmLabel="Remove"
        variant="warning"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
