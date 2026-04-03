import { Check, Palette } from "lucide-react";
import { COLOR_THEMES, type ColorThemeId } from "@/lib/colorThemes";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { PatternPicker } from "../components/PatternPicker";

const SAMPLE_BADGES = ["Agent", "Skill", "Run", "Output"];

export function ThemeManager() {
  const { colorTheme, setColorTheme, theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Theme Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customise the interface accent colour and background pattern. Saved locally.
        </p>
      </div>

      {/* ── Accent colours ──────────────────────────────────────────────── */}
      <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground/50 mb-4">
        Accent colour
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {COLOR_THEMES.map((t) => {
          const isActive = colorTheme === t.id;
          const accent = t.id === "violet"
            ? isDark ? "#a78bfa" : "#7c3aed"
            : t.id === "teal"
            ? isDark ? "#66FCF1" : "#0d9488"
            : t.id === "crimson"
            ? isDark ? "#f87171" : "#dc2626"
            : t.id === "ember"
            ? isDark ? "#fb923c" : "#ea580c"
            : t.id === "sage"
            ? isDark ? "#a1a79e" : "#838264"
            : isDark ? "#2c9e9e" : "#116466";
          const muted = t.id === "violet"
            ? isDark ? "#1e1535" : "#ede9fe"
            : t.id === "teal"
            ? isDark ? "#0b1f1e" : "#ccfbf1"
            : t.id === "crimson"
            ? isDark ? "#2c1111" : "#fee2e2"
            : t.id === "ember"
            ? isDark ? "#1c0e05" : "#ffedd5"
            : t.id === "sage"
            ? isDark ? "#1a1e1a" : "#e6e3de"
            : isDark ? "#0b1515" : "#d1e8e2";

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setColorTheme(t.id as ColorThemeId)}
              className={cn(
                "group relative flex flex-col rounded-xl border p-4 text-left transition-all",
                isActive
                  ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)] shadow-sm"
                  : "border-border bg-card hover:border-[var(--grace-accent)]/50 hover:bg-accent/30",
              )}
            >
              {isActive && (
                <div
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: accent }}
                >
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              )}

              <div className="mb-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg shadow-sm" style={{ background: accent }} />
                <div className="h-8 w-12 rounded-lg shadow-sm" style={{ background: muted, border: `1px solid ${accent}30` }} />
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {SAMPLE_BADGES.map((label) => (
                  <span
                    key={label}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ background: muted, color: accent, border: `1px solid ${accent}40` }}
                  >
                    {label}
                  </span>
                ))}
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: accent }}
                >
                  Active
                </span>
              </div>

              <div className="mt-auto">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground leading-snug">{t.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Background pattern ──────────────────────────────────────────── */}
      <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground/50 mb-4">
        Background pattern
      </h2>

      <div className="rounded-xl border border-border bg-card p-5 mb-10">
        <p className="text-xs text-muted-foreground mb-4">
          Subtle seamless pattern applied behind the entire interface.
        </p>
        <PatternPicker showLabel={false} />
      </div>

      {/* ── Live preview ────────────────────────────────────────────────── */}
      <h2 className="text-xs font-medium tracking-widest uppercase text-muted-foreground/50 mb-4">
        Preview
      </h2>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-[var(--grace-accent)]" />
          <span className="text-sm font-medium">Current accent</span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            className="rounded-md px-3 py-1.5 text-sm font-medium text-[var(--grace-accent-foreground)] transition-colors"
            style={{ background: "var(--grace-accent)" }}
          >
            Primary action
          </button>
          <button
            className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--grace-accent)", color: "var(--grace-accent)", background: "var(--grace-accent-muted)" }}
          >
            Secondary action
          </button>
          <span
            className="rounded px-2 py-1 text-xs font-medium"
            style={{ background: "var(--grace-accent-muted)", color: "var(--grace-accent)" }}
          >
            Badge
          </span>
          <div className="h-px flex-1 min-w-[40px]" style={{ background: "var(--grace-accent)" }} />
          <span className="text-xs text-muted-foreground">
            Currently: <span className="font-medium text-[var(--grace-accent)]">
              {COLOR_THEMES.find((t) => t.id === colorTheme)?.name}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
