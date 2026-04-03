/**
 * PatternPicker
 *
 * Reusable background-pattern selector row.
 * Used on the Home page and in Settings → Template Config.
 */

import { cn } from "@/lib/utils";
import { BG_PATTERNS, useBgPattern, type BgPatternKey } from "../hooks/useBgPattern";

function PatternSwatch({
  patternKey,
  active,
  onClick,
}: {
  patternKey: BgPatternKey;
  active: boolean;
  onClick: () => void;
}) {
  const def = BG_PATTERNS[patternKey];
  return (
    <button
      type="button"
      onClick={onClick}
      title={def.hint}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div
        className={cn(
          "w-10 h-10 rounded transition-all duration-150",
          active
            ? "border-2 border-[var(--grace-accent)] shadow-[0_0_0_1px_var(--grace-accent)]"
            : "border border-border hover:border-muted-foreground/40",
        )}
        style={{
          backgroundColor: "var(--background)",
          ...def.style,
        }}
      />
      <span
        className={cn(
          "text-[10px] leading-none transition-colors",
          active
            ? "text-[var(--grace-accent)] font-semibold"
            : "text-muted-foreground/50 group-hover:text-muted-foreground",
        )}
      >
        {def.label}
      </span>
    </button>
  );
}

interface PatternPickerProps {
  /** Show "Background" label to the left. Default true. */
  showLabel?: boolean;
}

export function PatternPicker({ showLabel = true }: PatternPickerProps) {
  const { pattern, setPattern } = useBgPattern();

  return (
    <div className="flex items-center gap-4">
      {showLabel && (
        <span className="text-xs text-muted-foreground/50 shrink-0 tracking-wide w-20">
          Background
        </span>
      )}
      <div className="flex items-end gap-3">
        {(Object.keys(BG_PATTERNS) as BgPatternKey[]).map((key) => (
          <PatternSwatch
            key={key}
            patternKey={key}
            active={pattern === key}
            onClick={() => setPattern(key)}
          />
        ))}
      </div>
    </div>
  );
}
