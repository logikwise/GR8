/**
 * Blueprint Service — Phase 2
 *
 * Loads Blueprints from the flat-file sample registry.
 * In Phase 3+, this module's exported functions can be swapped
 * to fetch from the backend API without changing consumers.
 *
 * TODO (Phase 3): Replace SAMPLE_BLUEPRINTS with a REST/GraphQL call to
 * GET /api/blueprints and POST /api/blueprints for create/update/delete.
 */

import type { Blueprint } from "./blueprintTypes";
import { SAMPLE_BLUEPRINTS } from "./sampleBlueprints";

let registry: Blueprint[] = [...SAMPLE_BLUEPRINTS];

export const blueprintService = {
  getAll(): Blueprint[] {
    return [...registry];
  },

  getById(id: string): Blueprint | null {
    return registry.find((bp) => bp.id === id) ?? null;
  },

  add(blueprint: Blueprint): Blueprint {
    const existing = registry.findIndex((bp) => bp.id === blueprint.id);
    if (existing >= 0) {
      registry[existing] = blueprint;
    } else {
      registry = [...registry, blueprint];
    }
    return blueprint;
  },

  remove(id: string): void {
    registry = registry.filter((bp) => bp.id !== id);
  },
};
