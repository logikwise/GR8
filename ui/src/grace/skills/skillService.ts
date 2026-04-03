/**
 * skillService — localStorage-backed CRUD for SkillDefinition assets.
 * Storage key: grace.skills.v1
 *
 * On first load, seeds from SAMPLE_SKILLS and persists them.
 * All mutations persist immediately.
 */

import type { SkillDefinition } from "./skillTypes";
import { SAMPLE_SKILLS } from "./sampleSkills";

const STORAGE_KEY = "grace.skills.v1";

function load(): SkillDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SkillDefinition[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupt storage — fall through to seed
  }
  const seeded = [...SAMPLE_SKILLS];
  save(seeded);
  return seeded;
}

function save(skills: SkillDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {
    // ignore storage errors
  }
}

function getAll(): SkillDefinition[] {
  return load();
}

function getById(id: string): SkillDefinition | undefined {
  return load().find((s) => s.id === id);
}

function add(skill: SkillDefinition): void {
  const all = load();
  const idx = all.findIndex((s) => s.id === skill.id);
  if (idx >= 0) {
    all[idx] = skill;
  } else {
    all.push(skill);
  }
  save(all);
}

function update(skill: SkillDefinition): void {
  add(skill);
}

function remove(id: string): void {
  const all = load().filter((s) => s.id !== id);
  save(all);
}

function duplicate(id: string): SkillDefinition | null {
  const original = getById(id);
  if (!original) return null;
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const copy: SkillDefinition = {
    ...original,
    id: `skill-${ts}-${rand}`,
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

function createSkeleton(name: string, category = "General"): SkillDefinition {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
  return {
    id: `skill-${ts}-${rand}`,
    name,
    slug: slug || `skill_${rand}`,
    version: "0.1.0",
    description: "",
    category,
    tags: [],
    source: "workspace",
    status: "draft",
    visibility: "private",
    providerCompatibility: [],
    metadata: {
      createdAt: new Date().toISOString(),
    },
  };
}

export const skillService = {
  getAll,
  getById,
  add,
  update,
  remove,
  duplicate,
  createSkeleton,
};
