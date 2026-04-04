import { ShieldCheck, Users, Building2, Key } from "lucide-react";

export function GraceAdmin() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Instance-level administration. Only accessible to admins.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { icon: <Users size={18} />, label: "Users & Roles", description: "Manage users and role assignments" },
          { icon: <Building2 size={18} />, label: "Workspaces", description: "Create and configure workspaces" },
          { icon: <Key size={18} />, label: "API Keys", description: "Manage API access keys" },
          { icon: <ShieldCheck size={18} />, label: "Audit Log", description: "Review system audit events" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 opacity-60 cursor-not-allowed"
          >
            <div className="mt-0.5 text-muted-foreground">{item.icon}</div>
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
              <div className="mt-1.5 text-[10px] text-muted-foreground/60 uppercase tracking-wide">Coming soon</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Admin</p>
        <p className="text-sm text-muted-foreground">
          Admin management APIs are coming soon. For now, use the
          Settings page for available configuration options.
        </p>
      </div>
    </div>
  );
}
