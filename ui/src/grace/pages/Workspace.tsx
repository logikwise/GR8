/**
 * GraceWorkspace — workspace context page.
 *
 * Shows workspace identity and links to GRACE-native surfaces.
 * Legacy workspace links (agents, tasks, routines) are preserved but
 * clearly labelled as legacy views outside the GRACE shell.
 */

import { Link } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import {
  LayoutDashboard, Users, Building2, BookOpen, Cpu,
  Layers, ExternalLink, CircleDot, Repeat,
} from "lucide-react";
import { AgentSwarm, MOCK_SWARM_AGENTS } from "../components/AgentSwarm";

export function GraceWorkspace() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? selectedCompanyId;

  return (
    <div className="relative min-h-full">
      <AgentSwarm
        agents={MOCK_SWARM_AGENTS}
        opacity={0.75}
        className="absolute inset-0 w-full h-full"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} className="text-[var(--grace-accent)]" />
            <span className="text-xs font-medium uppercase tracking-widest text-[var(--grace-accent)] opacity-80">Workspace</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {selectedCompany?.name ?? "Workspace"}
          </h1>
          {selectedCompany && (
            <p className="mt-1 text-sm text-muted-foreground">
              Active workspace · prefix <span className="font-mono">{selectedCompany.issuePrefix}</span>
            </p>
          )}
        </div>

        {/* GRACE-native links */}
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3">GRACE</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <WorkspaceLink to="/grace/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" description="Platform metrics and recent runs" />
            <WorkspaceLink to="/grace/instances"  icon={<Layers size={16} />}          label="Instances"  description="Active and completed instances" />
            <WorkspaceLink to="/grace/studio"     icon={<Cpu size={16} />}             label="Studio"     description="Design and observe workflows" />
            <WorkspaceLink to="/grace/library"    icon={<BookOpen size={16} />}        label="Workflows"  description="Blueprint library" />
            <WorkspaceLink to="/grace/org"        icon={<Users size={16} />}           label="Org & Team" description="Organisation structure" />
          </div>
        </div>

        {/* Legacy workspace links — only shown if a workspace is selected */}
        {prefix && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3 flex items-center gap-2">
              Legacy Workspace
              <span className="rounded border border-border px-1.5 py-px text-[9px] font-normal text-muted-foreground/50">opens outside GRACE shell</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <LegacyLink to={`/${prefix}/agents/all`} icon={<Users size={16} />}   label="Agents" description="All agents in this workspace" />
              <LegacyLink to={`/${prefix}/issues`}     icon={<CircleDot size={16} />} label="Tasks"  description="Open tasks and issues" />
              <LegacyLink to={`/${prefix}/routines`}   icon={<Repeat size={16} />}    label="Routines" description="Scheduled and recurring workflows" />
            </div>
          </div>
        )}

        {!prefix && (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            No workspace selected. Create or select a workspace to continue.
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceLink({
  to, icon, label, description,
}: {
  to: string; icon: React.ReactNode; label: string; description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]"
    >
      <div className="mt-0.5 shrink-0 text-[var(--grace-accent)]">{icon}</div>
      <div>
        <div className="text-sm font-medium text-foreground group-hover:text-[var(--grace-accent)]">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}

function LegacyLink({
  to, icon, label, description,
}: {
  to: string; icon: React.ReactNode; label: string; description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/60 px-4 py-3 transition-colors hover:border-border hover:bg-card"
    >
      <div className="shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground/50">{description}</div>
      </div>
      <ExternalLink size={11} className="shrink-0 text-muted-foreground/25 group-hover:text-muted-foreground/50" />
    </Link>
  );
}
