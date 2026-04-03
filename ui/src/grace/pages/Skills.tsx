import { useCompany } from "@/context/CompanyContext";
import { Link } from "@/lib/router";
import { Zap, ArrowRight } from "lucide-react";

export function GraceSkills() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? selectedCompanyId;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skills extend agent capabilities. Manage them per workspace.
        </p>
      </div>

      {prefix ? (
        <Link
          to={`/${prefix}/skills`}
          className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-[var(--grace-accent)]" />
            <div>
              <div className="text-sm font-medium group-hover:text-[var(--grace-accent)]">
                {selectedCompany?.name ?? "Workspace"} Skills
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">View and manage skills for this workspace</div>
            </div>
          </div>
          <ArrowRight size={14} className="text-muted-foreground group-hover:text-[var(--grace-accent)]" />
        </Link>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Select a workspace to manage its skills.
        </div>
      )}
    </div>
  );
}
