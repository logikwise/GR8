import { Link } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { LayoutDashboard, Users, CircleDot, Repeat } from "lucide-react";
import { AgentSwarm, MOCK_SWARM_AGENTS } from "../components/AgentSwarm";

export function GraceWorkspace() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? selectedCompanyId;

  return (
    <div className="relative min-h-full">
      {/* ── Ambient agent swarm — more prominent on Workspace ──────── */}
      <AgentSwarm
        agents={MOCK_SWARM_AGENTS}
        opacity={0.75}
        className="absolute inset-0 w-full h-full"
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Workspace</h1>
          {selectedCompany && (
            <p className="mt-1 text-sm text-muted-foreground">
              Active workspace: <span className="font-medium text-foreground">{selectedCompany.name}</span>
            </p>
          )}
        </div>

        {prefix ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <WorkspaceLink
              to={`/${prefix}/dashboard`}
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              description="Overview of workspace activity"
            />
            <WorkspaceLink
              to={`/${prefix}/agents/all`}
              icon={<Users size={18} />}
              label="Agents"
              description="All agents in this workspace"
            />
            <WorkspaceLink
              to={`/${prefix}/issues`}
              icon={<CircleDot size={18} />}
              label="Tasks"
              description="Open tasks and issues"
            />
            <WorkspaceLink
              to={`/${prefix}/routines`}
              icon={<Repeat size={18} />}
              label="Routines"
              description="Scheduled and recurring workflows"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/80 backdrop-blur-sm p-6 text-sm text-muted-foreground">
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
      className="group flex items-start gap-3 rounded-lg border border-border bg-card/70 backdrop-blur-sm p-4 transition-colors hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]"
    >
      <div className="mt-0.5 shrink-0 text-[var(--grace-accent)]">{icon}</div>
      <div>
        <div className="text-sm font-medium text-foreground group-hover:text-[var(--grace-accent)]">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
    </Link>
  );
}
