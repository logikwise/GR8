import { Link } from "@/lib/router";
import {
  Zap, Layers, BookOpen, Cpu, Wrench, FolderOpen, LibraryBig,
  Kanban, LayoutDashboard, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentSwarm } from "../components/AgentSwarm";

interface QuickLink {
  label: string;
  description: string;
  to: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Workflows",   description: "Browse and manage blueprint workflows",              to: "/grace/library",    icon: <BookOpen size={20} /> },
  { label: "Instances",   description: "View and manage workflow instances",                 to: "/grace/instances",  icon: <Layers size={20} /> },
  { label: "Studio",      description: "Build and observe agent workflows",                  to: "/grace/studio",     icon: <Cpu size={20} /> },
  { label: "Skills",      description: "Manage agent skills and capabilities",               to: "/grace/skills",     icon: <Zap size={20} /> },
  { label: "Tools",       description: "Configure tools available to agents",                to: "/grace/tools",      icon: <Wrench size={20} /> },
  { label: "Outputs",     description: "Review artifacts and outputs from runs",             to: "/grace/outputs",    icon: <FolderOpen size={20} /> },
  { label: "Library",     description: "Shared resources, knowledge bases, and documents",   to: "/grace/knowledge",  icon: <LibraryBig size={20} /> },
  {
    label: "Dashboard",
    description: "High-level metrics and activity across all workflows",
    to: "#", icon: <LayoutDashboard size={20} />, comingSoon: true,
  },
  {
    label: "Strategic Management",
    description: "Project and programme management across agent operations",
    to: "#", icon: <Kanban size={20} />, comingSoon: true,
  },
  {
    label: "Roster / Org",
    description: "Team roster, organisational structure, and role assignments",
    to: "#", icon: <Users size={20} />, comingSoon: true,
  },
];

function ActiveCard({ link }: { link: QuickLink }) {
  return (
    <Link
      to={link.to}
      className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]"
    >
      <div className="mt-0.5 shrink-0 text-[var(--grace-accent)]">{link.icon}</div>
      <div>
        <div className="text-sm font-medium text-foreground group-hover:text-[var(--grace-accent)]">{link.label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{link.description}</div>
      </div>
    </Link>
  );
}

function ComingSoonCard({ link }: { link: QuickLink }) {
  return (
    <div className="relative flex items-start gap-3 rounded-lg border border-dashed border-border/50 bg-card/50 p-4 opacity-50 cursor-default select-none">
      <div className="mt-0.5 shrink-0 text-muted-foreground/40">{link.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{link.label}</span>
          <span className="shrink-0 rounded-full border border-border px-1.5 py-px text-[9px] font-medium tracking-wide text-muted-foreground/60 uppercase">
            Soon
          </span>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground/60">{link.description}</div>
      </div>
    </div>
  );
}

export function GraceHome() {
  return (
    <div className="min-h-full flex flex-col relative">
      {/* ── Ambient agent swarm (behind content) ─────────────────────── */}
      <AgentSwarm
        opacity={0.45}
        className="absolute inset-0 w-full h-full"
      />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 px-10 pt-16 pb-10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--grace-accent)] mb-4 opacity-80">
          Kodavara Platform
        </p>
        <h1 className="text-6xl font-bold tracking-tight text-foreground leading-none mb-3">
          GRACE
        </h1>
        <p className="text-base text-muted-foreground/70 tracking-wide mb-2">
          G.R.A.C.E. — Generative Runtime Agent Coordination Engine
        </p>
        <p className="text-sm text-muted-foreground/50">
          Design, orchestrate, and observe AI agent workflows at any scale.
        </p>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="relative z-10 px-10">
        <div className="border-t border-border" />
      </div>

      {/* ── Quick links ───────────────────────────────────────────────── */}
      <div className="relative z-10 px-10 py-8 flex-1">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground/50 mb-4">
          Quick Links
        </p>
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-2xl")}>
          {QUICK_LINKS.map((link) =>
            link.comingSoon
              ? <ComingSoonCard key={link.label} link={link} />
              : <ActiveCard key={link.to} link={link} />
          )}
        </div>
      </div>
    </div>
  );
}
