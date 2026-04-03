/**
 * Blueprint Service — Phase 2+
 *
 * Persists Blueprints in localStorage (grace.blueprints.v1),
 * seeding from SAMPLE_BLUEPRINTS on first load so they survive page refreshes.
 *
 * TODO (Phase 3): Replace localStorage reads/writes with calls to the
 * backend API (GET /api/blueprints, POST /api/blueprints, etc.)
 * The surface of this module (getAll, getById, add, remove, update) should
 * remain stable so consumers do not need to change.
 */

import type { Blueprint } from "./blueprintTypes";
import { SAMPLE_BLUEPRINTS } from "./sampleBlueprints";

const STORAGE_KEY = "grace.blueprints.v1";

function load(): Blueprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Blueprint[];
  } catch {
    // corrupt data — fall through to seed
  }
  // First run: seed with sample blueprints and persist
  const seeded = [...SAMPLE_BLUEPRINTS];
  save(seeded);
  return seeded;
}

function save(blueprints: Blueprint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blueprints));
  } catch {
    console.warn("[blueprintService] Could not persist to localStorage.");
  }
}

export const blueprintService = {
  getAll(): Blueprint[] {
    return load();
  },

  getById(id: string): Blueprint | null {
    return load().find((bp) => bp.id === id) ?? null;
  },

  add(blueprint: Blueprint): Blueprint {
    const all = load();
    const idx = all.findIndex((bp) => bp.id === blueprint.id);
    if (idx >= 0) {
      all[idx] = blueprint;
    } else {
      all.push(blueprint);
    }
    save(all);
    return blueprint;
  },

  update(id: string, changes: Partial<Omit<Blueprint, "id">>): Blueprint | null {
    const all = load();
    const idx = all.findIndex((bp) => bp.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
    save(all);
    return all[idx];
  },

  remove(id: string): void {
    save(load().filter((bp) => bp.id !== id));
  },
};
