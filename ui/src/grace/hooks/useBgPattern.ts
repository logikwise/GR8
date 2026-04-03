/**
 * useBgPattern
 *
 * Manages the GRACE app background pattern preference.
 * Persists choice to localStorage under `grace.bgPattern`.
 * Returns the current pattern key, a setter, and the CSS style object to spread.
 */

import { useState, useCallback } from "react";

export type BgPatternKey = "none" | "hex" | "dots" | "grid" | "cross";

const STORAGE_KEY = "grace.bgPattern";

// ─── Pattern definitions ──────────────────────────────────────────────────────
// All patterns use neutral mid-grey strokes/fills so they read subtly in both
// dark and light mode. Adjust fill-opacity / rgba alpha for more/less intensity.

const HEX_SVG = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23808080' fill-opacity='0.07' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15zm0 15l13 7.5v15l-13 7.5L1 46.75v-15zm26 0l13 7.5v15l-13 7.5-13-7.5v-15zm-13-15l13 7.5v15l-13 7.5-13-7.5v-15zm13-15l13 7.5v15l-13 7.5-13-7.5v-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E`;

const CROSS_SVG = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath d='M9 0h2v20H9zm-9 9h20v2H0z' fill='%23808080' fill-opacity='0.07'/%3E%3C/svg%3E`;

export interface PatternDef {
  label: string;
  /** Tooltip / description */
  hint: string;
  /** CSS properties to apply to the background element */
  style: React.CSSProperties;
}

export const BG_PATTERNS: Record<BgPatternKey, PatternDef> = {
  none: {
    label: "None",
    hint: "Plain background",
    style: {},
  },
  hex: {
    label: "Hex",
    hint: "Subtle hexagon tessellation",
    style: {
      backgroundImage: `url("data:image/svg+xml,${HEX_SVG}")`,
      backgroundSize: "28px 49px",
      backgroundRepeat: "repeat",
    },
  },
  dots: {
    label: "Dots",
    hint: "Fine dot grid",
    style: {
      backgroundImage:
        "radial-gradient(circle, rgba(128,128,128,0.18) 1px, transparent 1px)",
      backgroundSize: "22px 22px",
      backgroundRepeat: "repeat",
    },
  },
  grid: {
    label: "Grid",
    hint: "Fine line grid",
    style: {
      backgroundImage: [
        "linear-gradient(rgba(128,128,128,0.07) 1px, transparent 1px)",
        "linear-gradient(90deg, rgba(128,128,128,0.07) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "20px 20px",
      backgroundRepeat: "repeat",
    },
  },
  cross: {
    label: "Cross",
    hint: "Repeating cross marks",
    style: {
      backgroundImage: `url("data:image/svg+xml,${CROSS_SVG}")`,
      backgroundSize: "20px 20px",
      backgroundRepeat: "repeat",
    },
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

function readStored(): BgPatternKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v in BG_PATTERNS) return v as BgPatternKey;
  } catch {
    // ignore
  }
  return "none";
}

export function useBgPattern() {
  const [pattern, setPatternState] = useState<BgPatternKey>(readStored);

  const setPattern = useCallback((key: BgPatternKey) => {
    setPatternState(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch { /* ignore */ }
  }, []);

  return {
    pattern,
    setPattern,
    patternDef: BG_PATTERNS[pattern],
    patternStyle: BG_PATTERNS[pattern].style,
  } as const;
}
