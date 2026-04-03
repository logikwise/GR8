import { NavLink, useNavigate } from "@/lib/router";
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
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/api/auth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface GraceNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const PRIMARY_NAV: GraceNavItem[] = [
  { label: "Home", to: "/grace/home", icon: <Home size={16} /> },
  { label: "Workspace", to: "/grace/workspace", icon: <LayoutDashboard size={16} /> },
  { label: "Workflow Library", to: "/grace/library", icon: <BookOpen size={16} /> },
  { label: "Studio", to: "/grace/studio", icon: <Cpu size={16} /> },
  { label: "Instances", to: "/grace/instances", icon: <Layers size={16} /> },
  { label: "Skills", to: "/grace/skills", icon: <Zap size={16} /> },
  { label: "Tools", to: "/grace/tools", icon: <Wrench size={16} /> },
  { label: "Outputs", to: "/grace/outputs", icon: <FileOutput size={16} /> },
];

const BOTTOM_NAV: GraceNavItem[] = [
  { label: "Settings", to: "/grace/settings", icon: <Settings size={16} /> },
  { label: "Admin", to: "/grace/admin", icon: <ShieldCheck size={16} /> },
];

function GraceNavLink({ item }: { item: GraceNavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-[var(--grace-accent-muted)] text-[var(--grace-accent)] font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )
      }
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export function GraceSidebar() {
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await authApi.signOut();
    } finally {
      queryClient.clear();
      navigate("/auth");
    }
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--grace-accent)] text-white text-xs font-bold shrink-0">
          G
        </div>
        <span className="text-sm font-semibold tracking-wide text-foreground">GRACE</span>
        <ChevronRight size={12} className="ml-auto text-muted-foreground" />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {PRIMARY_NAV.map((item) => (
          <GraceNavLink key={item.to} item={item} />
        ))}
      </nav>

      <div className="border-t border-border px-2 py-3 space-y-0.5">
        {BOTTOM_NAV.map((item) => (
          <GraceNavLink key={item.to} item={item} />
        ))}
      </div>

      <div className="border-t border-border px-3 py-3 flex items-center justify-between gap-2">
        <button
          onClick={toggleTheme}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button
          onClick={handleSignOut}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
