/**
 * Run Service — Phase 5
 *
 * Manages per-instance run records in localStorage.
 * Each instance can have at most one active run at a time.
 *
 * TODO (Phase 6): Replace localStorage reads/writes with calls to
 * backend API (POST /api/grace/runs, GET /api/grace/runs/:id, etc.)
 * The surface (getActiveRun, startRun, updateRunStatus, appendEvent,
 * appendChatMessage, completeRun) should stay stable.
 */

import type {
  RunRecord,
  RunStatus,
  StepStatus,
  RunEvent,
  ChatMessage,
  ProviderType,
} from "./providerTypes";

const STORAGE_KEY = "grace.runs.v1";
const MAX_EVENTS = 200;
const MAX_CHAT = 200;

function load(): RunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RunRecord[]) : [];
  } catch {
    return [];
  }
}

function save(runs: RunRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    console.warn("[runService] Could not persist run records.");
  }
}

function id(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function evId(): string {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const runService = {
  /** Get all run records across all instances (newest first) */
  getAll(): RunRecord[] {
    return load();
  },

  /** Alias for getAllForInstance — used by Dashboard and similar surfaces */
  getForInstance(instanceId: string): RunRecord[] {
    return load().filter((r) => r.instanceId === instanceId);
  },

  /** Get the most-recent run for an instance, regardless of status */
  getLatestRun(instanceId: string): RunRecord | null {
    const runs = load();
    return runs.find((r) => r.instanceId === instanceId) ?? null;
  },

  /** Get a run by its ID */
  getById(runId: string): RunRecord | null {
    return load().find((r) => r.id === runId) ?? null;
  },

  /** Get all runs for an instance (newest first) */
  getAllForInstance(instanceId: string): RunRecord[] {
    return load().filter((r) => r.instanceId === instanceId);
  },

  /** Create and persist a new run record */
  createRun(params: {
    instanceId: string;
    instanceName: string;
    providerType: ProviderType;
    stepNames: Array<{ id: string; name: string }>;
    providerRunId?: string;
  }): RunRecord {
    const run: RunRecord = {
      id: id(),
      instanceId: params.instanceId,
      instanceName: params.instanceName,
      providerType: params.providerType,
      providerRunId: params.providerRunId,
      status: "running",
      steps: params.stepNames.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        status: "idle",
      })),
      events: [
        {
          id: evId(),
          timestamp: new Date().toISOString(),
          level: "info",
          tag: "GRACE",
          message: `Run started · provider: ${params.providerType}`,
        },
      ],
      chatMessages: [
        {
          id: evId(),
          role: "system",
          content: `Instance "${params.instanceName}" run initiated. Waiting for agent response…`,
          timestamp: new Date().toISOString(),
        },
      ],
      startedAt: new Date().toISOString(),
    };

    const runs = load();
    runs.unshift(run);
    save(runs);
    return run;
  },

  updateRunStatus(runId: string, status: RunStatus, errorMessage?: string): void {
    const runs = load();
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx < 0) return;
    runs[idx] = {
      ...runs[idx],
      status,
      ...(errorMessage ? { errorMessage } : {}),
      ...((status === "completed" || status === "failed" || status === "cancelled")
        ? { completedAt: new Date().toISOString() }
        : {}),
    };
    save(runs);
  },

  updateStepStatus(runId: string, stepId: string, status: StepStatus, output?: string): void {
    const runs = load();
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx < 0) return;
    runs[idx] = {
      ...runs[idx],
      steps: runs[idx].steps.map((s) =>
        s.stepId === stepId
          ? {
              ...s,
              status,
              ...(status === "running" && !s.startedAt ? { startedAt: new Date().toISOString() } : {}),
              ...(status === "completed" || status === "failed" ? { completedAt: new Date().toISOString() } : {}),
              ...(output ? { output } : {}),
            }
          : s,
      ),
    };
    save(runs);
  },

  appendEvent(runId: string, event: Omit<RunEvent, "id" | "timestamp">): void {
    const runs = load();
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx < 0) return;
    const events = [
      ...runs[idx].events,
      { ...event, id: evId(), timestamp: new Date().toISOString() },
    ].slice(-MAX_EVENTS);
    runs[idx] = { ...runs[idx], events };
    save(runs);
  },

  appendChatMessage(runId: string, msg: Omit<ChatMessage, "id" | "timestamp">): void {
    const runs = load();
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx < 0) return;
    const chatMessages = [
      ...runs[idx].chatMessages,
      { ...msg, id: evId(), timestamp: new Date().toISOString() },
    ].slice(-MAX_CHAT);
    runs[idx] = { ...runs[idx], chatMessages };
    save(runs);
  },
};
