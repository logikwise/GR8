/**
 * toolService — localStorage-backed CRUD for ToolDefinition assets.
 * Storage key: grace.tools.v1
 *
 * On first load, seeds from SAMPLE_TOOLS and persists them.
 * All mutations persist immediately.
 */

import type { ToolDefinition } from "./toolTypes";
import { SAMPLE_TOOLS } from "./sampleTools";

const STORAGE_KEY = "grace.tools.v1";

function load(): ToolDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ToolDefinition[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupt storage — fall through to seed
  }
  const seeded = [...SAMPLE_TOOLS];
  save(seeded);
  return seeded;
}

function save(tools: ToolDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
  } catch {
    // ignore storage errors
  }
}

function getAll(): ToolDefinition[] {
  return load();
}

function getById(id: string): ToolDefinition | undefined {
  return load().find((t) => t.id === id);
}

function add(tool: ToolDefinition): void {
  const all = load();
  const idx = all.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    all[idx] = tool;
  } else {
    all.push(tool);
  }
  save(all);
}

function update(tool: ToolDefinition): void {
  add(tool);
}

function remove(id: string): void {
  const all = load().filter((t) => t.id !== id);
  save(all);
}

function duplicate(id: string): ToolDefinition | null {
  const original = getById(id);
  if (!original) return null;
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const copy: ToolDefinition = {
    ...original,
    id: `tool-${ts}-${rand}`,
    name: `${original.name} (Copy)`,
    slug: `${original.slug}_copy`,
    status: "draft",
    metadata: {
      ...original.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: `Duplicated from ${original.id}`,
    },
  };
  add(copy);
  return copy;
}

function createSkeleton(name: string, category = "General"): ToolDefinition {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
  return {
    id: `tool-${ts}-${rand}`,
    name,
    slug: slug || `tool_${rand}`,
    version: "0.1.0",
    description: "",
    category,
    tags: [],
    source: "workspace",
    executionType: "manual",
    status: "draft",
    visibility: "private",
    providerCompatibility: [],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };
}

export const toolService = {
  getAll,
  getById,
  add,
  update,
  remove,
  duplicate,
  createSkeleton,
};
