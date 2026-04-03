/**
 * GraceSidebar
 *
 * Supports expanded (w-56) and collapsed (w-12 icon-only) modes.
 * Starts expanded; user can toggle collapse at any time.
 */

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "@/lib/router";
import {
  Home,
  LayoutDashboard,
  BookOpen,
  Cpu,
  Layers,
  Wrench,
  FileOutput,
  Settings,
  ShieldCheck,
  Zap,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  LogOut,
  Monitor,
  Building2,
  LibraryBig,
  Plug,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/api/auth";
import { healthApi } from "@/api/health";
import { companiesApi } from "@/api/companies";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface GraceNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const PRIMARY_NAV: GraceNavItem[] = [
  { label: "Home",       to: "/grace/home",       icon: <Home size={16} /> },
  { label: "Dashboard",  to: "/grace/dashboard",  icon: <LayoutDashboard size={16} /> },
  { label: "Workflows",  to: "/grace/library",    icon: <BookOpen size={16} /> },
  { label: "Studio",     to: "/grace/studio",     icon: <Cpu size={16} /> },
  { label: "Instances",  to: "/grace/instances",  icon: <Layers size={16} /> },
  { label: "Skills",     to: "/grace/skills",     icon: <Zap size={16} /> },
  { label: "Tools",      to: "/grace/tools",      icon: <Wrench size={16} /> },
  { label: "Outputs",    to: "/grace/outputs",    icon: <FileOutput size={16} /> },
  { label: "Library",    to: "/grace/knowledge",  icon: <LibraryBig size={16} /> },
  { label: "Org",        to: "/grace/org",        icon: <Users size={16} /> },
];

const BOTTOM_NAV: GraceNavItem[] = [
  { label: "Connections", to: "/grace/connections", icon: <Plug size={16} /> },
  { label: "Settings",    to: "/grace/settings",    icon: <Settings size={16} /> },
  { label: "Admin",       to: "/grace/admin",       icon: <ShieldCheck size={16} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
      : name.trim().slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function displayName(name: string | null | undefined, email: string | null | undefined): string {
  if (name && name.trim()) return name.trim();
  if (email) return email;
  return "Unknown user";
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function GraceNavLink({ item, collapsed }: { item: GraceNavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "flex items-center rounded transition-colors",
          collapsed
            ? "justify-center w-9 h-9 mx-auto"
            : "gap-2.5 px-2.5 py-1.5 text-sm",
          isActive
            ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function GraceSidebar() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);

  const { data: health } = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
    retry: false,
    staleTime: 60_000,
  });

  const isAuthenticatedMode =
    (health as { deploymentMode?: string } | undefined)?.deploymentMode === "authenticated";

  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
    staleTime: 5 * 60_000,
    enabled: isAuthenticatedMode,
  });

  const { data: companies } = useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: () => companiesApi.list(),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const user = session?.user ?? null;
  const company = companies?.[0] ?? null;
  const userInitials = initials(user?.name, user?.email);
  const userName = displayName(user?.name, user?.email);
  const companyName = (company as { name?: string } | null)?.name ?? null;

  async function handleSignOut() {
    try { await authApi.signOut(); }
    finally { queryClient.clear(); navigate("/auth"); }
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-12" : "w-56"
      )}
    >
      {/* Header / Logo */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0",
          collapsed ? "justify-center py-3.5 px-0" : "gap-2 px-4 py-4"
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--grace-accent)] text-white text-xs font-bold">
          K
        </div>
        {!collapsed && (
          <>
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold tracking-widest text-muted-foreground/60 uppercase">Kodavara</span>
              <span className="text-sm font-bold tracking-wide text-foreground">GRACE</span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="ml-auto flex items-center justify-center w-6 h-6 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
              title="Collapse sidebar"
            >
              <ChevronsLeft size={13} />
            </button>
          </>
        )}
        {collapsed && <span className="sr-only">Kodavara GRACE</span>}
      </div>

      {/* Expand button (collapsed mode only) */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-9 h-7 mx-auto mt-2 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-colors"
          title="Expand sidebar"
        >
          <ChevronsRight size={13} />
        </button>
      )}

      {/* Primary nav */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-2",
          collapsed ? "px-0 space-y-0.5" : "px-2 space-y-0.5"
        )}
      >
        {PRIMARY_NAV.map((item) => (
          <GraceNavLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div
        className={cn(
          "border-t border-border py-2",
          collapsed ? "px-0 space-y-0.5" : "px-2 space-y-0.5"
        )}
      >
        {BOTTOM_NAV.map((item) => (
          <GraceNavLink key={item.to} item={item} collapsed={collapsed} />
        ))}
      </div>

      {/* User identity block */}
      {collapsed ? (
        /* Collapsed: avatar circle only */
        <div className="border-t border-border flex flex-col items-center gap-1 py-2">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] text-xs font-semibold shrink-0 cursor-default select-none"
            title={companyName ? `${userName} · ${companyName}` : userName}
          >
            {userInitials}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {isAuthenticatedMode ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center w-9 h-9 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          ) : (
            <span
              className="flex items-center justify-center w-9 h-9 text-muted-foreground/30"
              title="Running in local trusted mode"
            >
              <Monitor size={14} />
            </span>
          )}
        </div>
      ) : (
        /* Expanded: full user + company block */
        <div className="border-t border-border shrink-0">
          {/* User row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] text-[11px] font-semibold shrink-0 select-none">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate leading-tight">
                {userName}
              </p>
              {companyName && (
                <p className="text-[11px] text-muted-foreground/70 truncate leading-tight flex items-center gap-1 mt-0.5">
                  <Building2 size={10} className="shrink-0" />
                  {companyName}
                </p>
              )}
            </div>
          </div>
          {/* Theme + sign out row */}
          <div className="flex items-center justify-between px-3 pb-2.5 gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {isAuthenticatedMode ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Sign out
              </button>
            ) : (
              <span
                className="text-xs text-muted-foreground/50 cursor-default"
                title="Running in local trusted mode — no authentication required"
              >
                Local mode
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
