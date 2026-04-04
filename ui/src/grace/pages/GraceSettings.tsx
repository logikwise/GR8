/**
 * GraceSettings — Phase 8
 *
 * Separates GRACE-native settings (Theme, Connections) from legacy
 * system settings (General, Experimental, Plugins) which still point
 * to the base-system /instance/settings/* routes.
 *
 * Legacy routes are clearly labelled and will be migrated in Phase 9.
 */

import { Link } from "@/lib/router";
import { Settings, ArrowRight, Sliders, FlaskConical, Puzzle, Palette, ExternalLink, Plug } from "lucide-react";

type SettingsEntry = {
  to: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  legacy?: boolean;
};

const GRACE_SETTINGS: SettingsEntry[] = [
  {
    to: "/grace/theme",
    icon: <Palette size={18} />,
    label: "Theme Manager",
    description: "Accent colour, background pattern, and visual preferences",
  },
  {
    to: "/grace/connections",
    icon: <Plug size={18} />,
    label: "Connections",
    description: "Configure provider connections and run health checks",
  },
];

const LEGACY_SETTINGS: SettingsEntry[] = [
  {
    to: "/instance/settings/general",
    icon: <Settings size={18} />,
    label: "General Settings",
    description: "Instance name, configuration, and global options",
    legacy: true,
  },
  {
    to: "/instance/settings/heartbeats",
    icon: <Sliders size={18} />,
    label: "Adapter Connections (Legacy)",
    description: "Legacy adapter heartbeat and connection management",
    legacy: true,
  },
  {
    to: "/instance/settings/experimental",
    icon: <FlaskConical size={18} />,
    label: "Experimental",
    description: "Preview and toggle experimental features",
    legacy: true,
  },
  {
    to: "/instance/settings/plugins",
    icon: <Puzzle size={18} />,
    label: "Plugins",
    description: "Manage installed plugins and extensions",
    legacy: true,
  },
];

function SettingsLink({ entry }: { entry: SettingsEntry }) {
  return (
    <Link
      to={entry.to}
      className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)] transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className={entry.legacy ? "text-muted-foreground/60" : "text-[var(--grace-accent)]"}>
          {entry.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium group-hover:text-[var(--grace-accent)]">
              {entry.label}
            </span>
            {entry.legacy && (
              <span className="rounded border border-border px-1.5 py-px text-[9px] text-muted-foreground/50 flex items-center gap-0.5">
                <ExternalLink size={7} /> legacy
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{entry.description}</div>
        </div>
      </div>
      <ArrowRight size={14} className="text-muted-foreground group-hover:text-[var(--grace-accent)]" />
    </Link>
  );
}

export function GraceSettings() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your GRACE environment.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">
            GRACE
          </p>
          <div className="space-y-2">
            {GRACE_SETTINGS.map((entry) => (
              <SettingsLink key={entry.to} entry={entry} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 flex items-center gap-2">
            System
            <span className="rounded border border-border px-1.5 py-px text-[9px] font-normal text-muted-foreground/50">
              opens outside GRACE shell — legacy
            </span>
          </p>
          <div className="space-y-2">
            {LEGACY_SETTINGS.map((entry) => (
              <SettingsLink key={entry.to} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
