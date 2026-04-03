/**
 * Instance Service — Phase 2
 *
 * Stores and retrieves Instances using localStorage.
 * This is an intentionally thin, replaceable persistence layer.
 *
 * TODO (Phase 3): Replace localStorage reads/writes with calls to the
 * backend API (POST /api/instances, GET /api/instances/:id, etc.)
 * The surface of this module (getAll, getById, create, update, remove)
 * should remain stable so consumers do not need to change.
 *
 * GRACE-REVIEW: When backend persistence is wired, remove the localStorage
 * fallback and add proper error handling / optimistic updates.
 */

import type { Instance, InstanceStatus } from "./instanceTypes";
import { runService } from "../providers/runService";

const STORAGE_KEY = "grace.instances.v1";

function load(): Instance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Instance[]) : [];
  } catch {
    return [];
  }
}

function save(instances: Instance[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  } catch {
    console.warn("[instanceService] Could not persist to localStorage.");
  }
}

function generateId(): string {
  return `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export type CreateInstancePayload = Omit<Instance, "id" | "createdAt" | "updatedAt">;

export const instanceService = {
  getAll(): Instance[] {
    return load();
  },

  getById(id: string): Instance | null {
    return load().find((inst) => inst.id === id) ?? null;
  },

  create(payload: CreateInstancePayload): Instance {
    const now = new Date().toISOString();
    const instance: Instance = {
      ...payload,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const instances = load();
    instances.unshift(instance);
    save(instances);
    return instance;
  },

  update(id: string, partial: Partial<Omit<Instance, "id" | "createdAt">>): Instance | null {
    const instances = load();
    const idx = instances.findIndex((i) => i.id === id);
    if (idx < 0) return null;
    const updated: Instance = {
      ...instances[idx],
      ...partial,
      id,
      updatedAt: new Date().toISOString(),
    };
    instances[idx] = updated;
    save(instances);
    return updated;
  },

  updateStatus(id: string, status: InstanceStatus): Instance | null {
    return instanceService.update(id, { status });
  },

  remove(id: string): void {
    const instances = load().filter((i) => i.id !== id);
    save(instances);
    runService.deleteForInstance(id);
  },
};
