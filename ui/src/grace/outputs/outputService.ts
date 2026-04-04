/**
 * outputService — Phase 9
 *
 * Persists OutputRecord entries in localStorage under "grace.outputs.v1".
 * Populated by Studio polling when a run completes; read by Library/Outputs pages.
 *
 * OutputRecord types: json | file | image | link | text | data
 *
 * TODO (next): Replace with POST /api/grace/outputs on run completion.
 */

const STORAGE_KEY = "grace.outputs.v1";
const MAX_OUTPUTS = 500;

export type OutputRecordType = "json" | "file" | "image" | "link" | "text" | "data" | "report";

export interface OutputRecord {
  id: string;
  runId: string;
  instanceId: string;
  instanceName: string;
  stepId?: string;
  stepName?: string;
  type: OutputRecordType;
  label: string;
  content?: string;
  reference?: string;
  sizeBytes?: number;
  timestamp: string;
}

function randomId(): string {
  return `out-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): OutputRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OutputRecord[];
  } catch {
    return [];
  }
}

function save(records: OutputRecord[]): void {
  try {
    const trimmed = records.slice(-MAX_OUTPUTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full — silently skip
  }
}

export const outputService = {
  getAll(): OutputRecord[] {
    return load().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  getForRun(runId: string): OutputRecord[] {
    return load().filter((r) => r.runId === runId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  getForInstance(instanceId: string): OutputRecord[] {
    return load().filter((r) => r.instanceId === instanceId).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  add(record: Omit<OutputRecord, "id" | "timestamp">): OutputRecord {
    const full: OutputRecord = {
      ...record,
      id: randomId(),
      timestamp: new Date().toISOString(),
    };
    const all = load();
    all.push(full);
    save(all);
    return full;
  },

  addFromRun(params: {
    runId: string;
    instanceId: string;
    instanceName: string;
    type: OutputRecordType;
    label: string;
    content?: string;
    reference?: string;
    stepId?: string;
    stepName?: string;
  }): OutputRecord {
    return outputService.add(params);
  },

  delete(id: string): void {
    save(load().filter((r) => r.id !== id));
  },

  deleteForRun(runId: string): void {
    save(load().filter((r) => r.runId !== runId));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
