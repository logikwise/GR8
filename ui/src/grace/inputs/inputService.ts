/**
 * inputService — Phase 8
 *
 * Persists GraceInputAsset records in localStorage under "grace.inputs.v1".
 * Keyed per instance — all assets are stored in a flat list and filtered
 * by instanceId at query time.
 *
 * TODO (Phase 9): Replace with API calls:
 *   POST /api/grace/inputs      — persist asset record
 *   GET  /api/grace/inputs      — list assets (by instanceId, runId)
 *   DELETE /api/grace/inputs/:id — remove asset
 */

import type { GraceInputAsset, InputSourceType } from "./inputTypes";

const STORAGE_KEY = "grace.inputs.v1";

function randomId(): string {
  return `inp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): GraceInputAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GraceInputAsset[];
  } catch {
    return [];
  }
}

function save(assets: GraceInputAsset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch {
    // storage full — silently skip
  }
}

export const inputService = {
  getAll(): GraceInputAsset[] {
    return load();
  },

  getForInstance(instanceId: string): GraceInputAsset[] {
    return load().filter((a) => a.instanceId === instanceId);
  },

  getForRun(runId: string): GraceInputAsset[] {
    return load().filter((a) => a.runId === runId);
  },

  addLink(instanceId: string, url: string, runId?: string): GraceInputAsset {
    const asset: GraceInputAsset = {
      id: randomId(),
      instanceId,
      runId,
      name: (() => { try { return new URL(url).hostname; } catch { return url.slice(0, 40); } })(),
      type: "link",
      sourceType: "link" as InputSourceType,
      reference: url,
      createdAt: new Date().toISOString(),
    };
    const all = load();
    all.push(asset);
    save(all);
    return asset;
  },

  addFile(instanceId: string, file: File, objectUrl: string, runId?: string): GraceInputAsset {
    const asset: GraceInputAsset = {
      id: randomId(),
      instanceId,
      runId,
      name: file.name,
      type: file.name.split(".").pop()?.toLowerCase() ?? "file",
      sourceType: "upload" as InputSourceType,
      mimeType: file.type || undefined,
      reference: objectUrl,
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
    };
    const all = load();
    all.push(asset);
    save(all);
    return asset;
  },

  delete(id: string): void {
    const filtered = load().filter((a) => a.id !== id);
    save(filtered);
  },

  deleteForInstance(instanceId: string): void {
    const filtered = load().filter((a) => a.instanceId !== instanceId);
    save(filtered);
  },
};
