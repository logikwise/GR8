import { Link } from "@/lib/router";
import { Zap, Layers, BookOpen, Cpu, Wrench, FileOutput } from "lucide-react";

const QUICK_LINKS = [
  { label: "Workflow Library", description: "Browse and manage blueprints", to: "/grace/library", icon: <BookOpen size={20} /> },
  { label: "Instances", description: "View and manage running instances", to: "/grace/instances", icon: <Layers size={20} /> },
  { label: "Studio", description: "Build and observe agent workflows", to: "/grace/studio", icon: <Cpu size={20} /> },
  { label: "Skills", description: "Manage agent skills", to: "/grace/skills", icon: <Zap size={20} /> },
  { label: "Tools", description: "Configure available tools", to: "/grace/tools", icon: <Wrench size={20} /> },
  { label: "Outputs", description: "Review agent outputs", to: "/grace/outputs", icon: <FileOutput size={20} /> },
];

export function GraceHome() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to GRACE</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          GRACE — your agent orchestration and workflow platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]"
          >
            <div className="mt-0.5 shrink-0 text-[var(--grace-accent)]">{link.icon}</div>
            <div>
              <div className="text-sm font-medium text-foreground group-hover:text-[var(--grace-accent)]">
                {link.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{link.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
