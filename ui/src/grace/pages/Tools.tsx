/**
 * Tools — Phase 3
 *
 * The tools library is structured to support multiple future import/source paths
 * mirroring the Skills library pattern. Plugins will later follow the same structure.
 *
 * TODO (Phase 4): Wire each source to a real tool registration/import flow.
 * TODO (Phase 4): List and manage tools from GET /api/tools.
 * GRACE-REVIEW: Tool metadata (id, name, description, provider, version, status)
 * is designed for reuse across Studio, Mission Control, and admin panels.
 */

import {
  Wrench,
  Plus,
  Upload,
  GitBranch,
  Globe,
  Package,
  Server,
  Puzzle,
} from "lucide-react";

const IMPORT_SOURCES = [
  {
    id: "register",
    label: "Register Tool",
    description: "Define a new tool endpoint and configure its input/output schema.",
    icon: <Server size={16} />,
    available: false,
  },
  {
    id: "create",
    label: "Create New",
    description: "Scaffold a new tool from a template with metadata and schema.",
    icon: <Plus size={16} />,
    available: false,
  },
  {
    id: "upload",
    label: "Upload / Import File",
    description: "Import a tool definition from a .json or .yaml package.",
    icon: <Upload size={16} />,
    available: false,
  },
  {
    id: "git",
    label: "Import from Git",
    description: "Pull a tool directly from a Git repository.",
    icon: <GitBranch size={16} />,
    available: false,
  },
  {
    id: "url",
    label: "Import from URL",
    description: "Fetch a tool definition from any public endpoint.",
    icon: <Globe size={16} />,
    available: false,
  },
  {
    id: "plugins",
    label: "Plugin Marketplace",
    description: "Browse tools available through the platform plugin system.",
    icon: <Puzzle size={16} />,
    available: false,
  },
  {
    id: "community",
    label: "Community Tools",
    description: "Browse and install verified community-built tools.",
    icon: <Package size={16} />,
    available: false,
  },
];

export function GraceTools() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tools are external capabilities available to agents during runs. Register, import, and manage tools for your workspace.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center mb-6">
        <Wrench size={28} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No tools registered yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Register a tool endpoint or import a tool package to get started.
        </p>
      </div>

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
          The Tools library mirrors the Skills library structure. Plugins will follow the same import/registration pattern. Tool metadata is designed for reuse across Studio, Mission Control, and admin panels.
        </p>
      </div>
    </div>
  );
}
