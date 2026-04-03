/**
 * Skills — Phase 3
 *
 * The skills library is structured to support multiple future import/source paths:
 * - Connected workspace skills
 * - Create new skill
 * - Upload / import file or package
 * - Import from git source
 * - Import from skills.sh
 * - Import from URL
 *
 * TODO (Phase 4): Wire each source card to a real import flow.
 * TODO (Phase 4): List and manage skills from GET /api/skills.
 * GRACE-REVIEW: Skills metadata (author, version, capabilities, platform) mirrors
 * the Blueprint metadata pattern and will be reused by Mission Control.
 */

import { useCompany } from "@/context/CompanyContext";
import { Link } from "@/lib/router";
import {
  Zap,
  ArrowRight,
  Plus,
  Upload,
  GitBranch,
  Globe,
  Package,
  ExternalLink,
} from "lucide-react";

const IMPORT_SOURCES = [
  {
    id: "workspace",
    label: "Connected Workspace",
    description: "Import skills from a connected workspace.",
    icon: <Zap size={16} />,
    available: false,
  },
  {
    id: "create",
    label: "Create New",
    description: "Define a new skill from scratch with a schema template.",
    icon: <Plus size={16} />,
    available: false,
  },
  {
    id: "upload",
    label: "Upload / Import File",
    description: "Upload a skill package (.json, .yaml, .zip).",
    icon: <Upload size={16} />,
    available: false,
  },
  {
    id: "git",
    label: "Import from Git",
    description: "Pull a skill directly from a Git repository URL.",
    icon: <GitBranch size={16} />,
    available: false,
  },
  {
    id: "url",
    label: "Import from URL",
    description: "Fetch a skill definition from any public endpoint.",
    icon: <Globe size={16} />,
    available: false,
  },
  {
    id: "skillssh",
    label: "Import from skills.sh",
    description: "Browse and install verified community skills.",
    icon: <Package size={16} />,
    available: false,
  },
];

export function GraceSkills() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? selectedCompanyId;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Skills extend agent capabilities. Browse, create, and import skills for your workspace.
          </p>
        </div>
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

      <div className="mb-3 flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Import Sources</p>
        <span className="text-[10px] rounded bg-muted/60 px-1.5 py-0.5 text-muted-foreground">Phase 4</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {IMPORT_SOURCES.map((src) => (
          <div
            key={src.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3 opacity-60 cursor-not-allowed"
            title="Coming in Phase 4"
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground/60">{src.icon}</div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-muted-foreground">{src.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/60 leading-snug">{src.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phase 3 Note</p>
        <p className="text-sm text-muted-foreground">
          The Skills library will support multiple import sources in Phase 4. Skills metadata (author, version, capabilities, provider) is modelled to support future Mission Control visibility.
        </p>
      </div>
    </div>
  );
}
