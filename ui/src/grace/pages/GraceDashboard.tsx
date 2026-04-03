/**
 * GraceDashboard — GRACE-native dashboard page.
 *
 * Stable home surface for platform-level metrics and activity.
 * Remains within the GRACE shell — no legacy redirects.
 * Future: wire to real run/instance metrics.
 */

import { useMemo } from "react";
import { Link } from "@/lib/router";
import {
  LayoutDashboard, Layers, Cpu, BookOpen, Zap, Wrench,
  TrendingUp, Activity, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { instanceService } from "../instances/instanceService";
import { runService } from "../providers/runService";
import { cn } from "@/lib/utils";

function StatCard({
  label, value, icon, sub, accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 flex flex-col gap-3",
      accent ? "border-[var(--grace-accent)]/30" : "border-border",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">{label}</span>
        <span className={cn("text-muted-foreground/40", accent && "text-[var(--grace-accent)]/60")}>{icon}</span>
      </div>
      <div>
        <div className={cn("text-2xl font-semibold tabular-nums", accent && "text-[var(--grace-accent)]")}>{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground/50">{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">{children}</p>
  );
}

export function GraceDashboard() {
  const instances = useMemo(() => instanceService.getAll(), []);
  const allRuns = useMemo(() => runService.getAll(), []);

  const runningInstances = instances.filter((i) => {
    const runs = runService.getForInstance(i.id);
    return runs.some((r) => r.status === "running");
  });

  const completedRuns = allRuns.filter((r) => r.status === "completed");
  const failedRuns = allRuns.filter((r) => r.status === "failed");

  const recentRuns = [...allRuns]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard size={16} className="text-[var(--grace-accent)]" />
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--grace-accent)] opacity-80">Dashboard</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform activity across all workflow instances and runs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        <StatCard
          label="Instances"
          value={instances.length}
          icon={<Layers size={15} />}
          sub="total created"
          accent
        />
        <StatCard
          label="Active"
          value={runningInstances.length}
          icon={<Activity size={15} />}
          sub="currently running"
        />
        <StatCard
          label="Completed"
          value={completedRuns.length}
          icon={<CheckCircle2 size={15} />}
          sub="all-time runs"
        />
        <StatCard
          label="Failed"
          value={failedRuns.length}
          icon={<AlertCircle size={15} />}
          sub="need attention"
        />
      </div>

      {/* Recent runs */}
      <div className="mb-8">
        <SectionHeading>Recent Runs</SectionHeading>
        {recentRuns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-xs text-muted-foreground/50">No runs yet. Create an instance and start a run from Studio.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentRuns.map((run) => {
              const statusColors: Record<string, string> = {
                running:   "text-blue-400",
                completed: "text-emerald-400",
                failed:    "text-red-400",
                pending:   "text-yellow-400",
                cancelled: "text-muted-foreground",
              };
              return (
                <div key={run.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                  <TrendingUp size={12} className="shrink-0 text-muted-foreground/40" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{run.instanceName}</span>
                  <span className={cn("text-xs font-medium tabular-nums shrink-0", statusColors[run.status] ?? "text-muted-foreground")}>
                    {run.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 shrink-0 font-mono">
                    {run.startedAt.slice(0, 10)}
                  </span>
                  <Clock size={10} className="text-muted-foreground/20 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick access */}
      <div>
        <SectionHeading>Quick Access</SectionHeading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            { to: "/grace/instances", label: "Instances",  icon: <Layers size={14} />,   description: "View all instances" },
            { to: "/grace/studio",    label: "Studio",     icon: <Cpu size={14} />,       description: "Open Studio" },
            { to: "/grace/library",   label: "Workflows",  icon: <BookOpen size={14} />,  description: "Browse blueprints" },
            { to: "/grace/skills",    label: "Skills",     icon: <Zap size={14} />,       description: "Manage skills" },
            { to: "/grace/tools",     label: "Tools",      icon: <Wrench size={14} />,    description: "Manage tools" },
            { to: "/grace/outputs",   label: "Outputs",    icon: <TrendingUp size={14} />, description: "Review artifacts" },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-[var(--grace-accent)]/40 hover:bg-[var(--grace-accent-muted)] transition-colors"
            >
              <span className="text-muted-foreground/50 group-hover:text-[var(--grace-accent)] transition-colors shrink-0">{link.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium group-hover:text-[var(--grace-accent)] transition-colors">{link.label}</div>
                <div className="text-[10px] text-muted-foreground/40 truncate">{link.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
