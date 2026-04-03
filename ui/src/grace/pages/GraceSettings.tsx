import { Link } from "@/lib/router";
import { Settings, ArrowRight, Sliders, FlaskConical, Puzzle, Palette } from "lucide-react";

const SETTINGS_LINKS = [
  {
    to: "/grace/theme",
    icon: <Palette size={18} />,
    label: "Theme Manager",
    description: "Accent colour, background pattern, and visual preferences",
  },
  {
    to: "/instance/settings/general",
    icon: <Settings size={18} />,
    label: "General Settings",
    description: "Instance name, configuration, and global options",
  },
  {
    to: "/instance/settings/heartbeats",
    icon: <Sliders size={18} />,
    label: "Connections",
    description: "Manage agent adapter connections",
  },
  {
    to: "/instance/settings/experimental",
    icon: <FlaskConical size={18} />,
    label: "Experimental",
    description: "Preview and toggle experimental features",
  },
  {
    to: "/instance/settings/plugins",
    icon: <Puzzle size={18} />,
    label: "Plugins",
    description: "Manage installed plugins and extensions",
  },
];

export function GraceSettings() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your GRACE instance.
        </p>
      </div>

      <div className="space-y-2">
        {SETTINGS_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="text-[var(--grace-accent)]">{link.icon}</div>
              <div>
                <div className="text-sm font-medium group-hover:text-[var(--grace-accent)]">{link.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{link.description}</div>
              </div>
            </div>
            <ArrowRight size={14} className="text-muted-foreground group-hover:text-[var(--grace-accent)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
