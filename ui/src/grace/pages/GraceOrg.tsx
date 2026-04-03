/**
 * GraceOrg — GRACE-native organisation/team page.
 *
 * Stable scaffold for future org/workspace/team structure.
 * Stays within the GRACE shell — no legacy redirects.
 * Future: wire to real workspace/user/role data.
 */

import { Building2, Users, ShieldCheck, Settings } from "lucide-react";
import { Link } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { cn } from "@/lib/utils";

interface OrgSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  future?: boolean;
  children?: React.ReactNode;
}

function OrgSection({ icon, title, description, future, children }: OrgSectionProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-5",
      future ? "border-dashed border-border/50 opacity-50" : "border-border",
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 shrink-0 text-[var(--grace-accent)]/70">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {future && (
              <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[9px] font-medium tracking-wide text-muted-foreground/60 uppercase">
                Soon
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function GraceOrg() {
  const { selectedCompany } = useCompany();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} className="text-[var(--grace-accent)]" />
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--grace-accent)] opacity-80">Organisation</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Org &amp; Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organisation structure, team members, and role assignments.
        </p>
      </div>

      {/* Workspace info */}
      <div className="rounded-lg border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--grace-accent)]/30 bg-[var(--grace-accent-muted)]">
            <Building2 size={18} className="text-[var(--grace-accent)]" />
          </div>
          <div>
            <div className="text-sm font-semibold">{selectedCompany?.name ?? "No workspace selected"}</div>
            {selectedCompany && (
              <div className="text-xs text-muted-foreground mt-0.5">
                Prefix: <span className="font-mono">{selectedCompany.issuePrefix}</span>
              </div>
            )}
          </div>
          <Link
            to="/grace/settings"
            className="ml-auto flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-[var(--grace-accent)]/40 hover:text-foreground transition-colors"
          >
            <Settings size={11} />
            Settings
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <OrgSection
          icon={<Users size={16} />}
          title="Team Members"
          description="Invite team members, assign roles, and manage access to this workspace."
          future
        />

        <OrgSection
          icon={<ShieldCheck size={16} />}
          title="Roles &amp; Permissions"
          description="Define builder, operator, and viewer roles. Control what each role can create, run, and view."
          future
        />

        <OrgSection
          icon={<Building2 size={16} />}
          title="Workspace Structure"
          description="Organise projects and blueprints into workspace units. Support for sub-teams and departments is planned."
          future
        />
      </div>

      <div className="mt-6 rounded-lg border border-[var(--grace-accent)]/20 bg-[var(--grace-accent-muted)]/30 p-4">
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          <span className="font-medium text-[var(--grace-accent)]">Planned for future phases:</span> Full org and workspace tenancy management, including invitation flows, SSO integration, budget enforcement, and audit logs.
        </p>
      </div>
    </div>
  );
}
