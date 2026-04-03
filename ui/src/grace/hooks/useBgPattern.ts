/**
 * useBgPattern
 *
 * Manages the GRACE app background pattern preference.
 * Persists choice to localStorage under `grace.bgPattern`.
 */

import { useState, useCallback } from "react";

export type BgPatternKey = "none" | "hex" | "dots" | "grid" | "cross";

const STORAGE_KEY = "grace.bgPattern";

// ─── Pattern definitions ──────────────────────────────────────────────────────
// Patterns use neutral mid-grey so they work in both dark and light mode.
//
// HEX: stroke-only hex outlines (fill='none'), scaled to 42×73 so hexagons
//      are clearly readable (~20px across) rather than blurred fill-blobs.

const HEX_SVG = [
  `%3Csvg xmlns='http://www.w3.org/2000/svg'`,
  ` width='42' height='74' viewBox='0 0 28 49'%3E`,
  `%3Cpath`,
  ` d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15z`,
  `M13.99 24.25l13 7.5v15l-13 7.5L1 46.75v-15z`,
  `M39.99 24.25l13 7.5v15l-13 7.5-13-7.5v-15z`,
  `M26.99 9.25l13 7.5v15l-13 7.5-13-7.5v-15z`,
  `M39.99 9.25l13 7.5v15l-13 7.5-13-7.5v-15z'`,
  ` fill='none'`,
  ` stroke='rgba(128,128,128,0.15)'`,
  ` stroke-width='0.6'/%3E`,
  `%3C/svg%3E`,
].join("");

const CROSS_SVG = [
  `%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E`,
  `%3Cpath d='M9 0h2v20H9zm-9 9h20v2H0z'`,
  ` fill='rgba(128,128,128,0.08)'/%3E`,
  `%3C/svg%3E`,
].join("");

export interface PatternDef {
  label: string;
  hint: string;
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
    hint: "Hexagon outline grid",
    style: {
      backgroundImage: `url("data:image/svg+xml,${HEX_SVG}")`,
      backgroundSize: "42px 74px",
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
  } catch { /* ignore */ }
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
