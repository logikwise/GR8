/**
 * Provider Abstraction Layer — Phase 5
 *
 * Defines the clean provider interface that GRACE uses to talk to any
 * execution backend. OpenClaw is the first real implementation; others
 * (Hermes, Claude, Codex, etc.) follow the same shape.
 *
 * Rules:
 *  - All provider-specific logic lives inside the concrete provider file.
 *  - UI code only imports this types file + providerService.ts.
 *  - Do NOT bake provider-specific assumptions into this interface.
 */

// ─── Provider identity ────────────────────────────────────────────────────────

export type ProviderType = "openclaw" | "hermes" | "claude" | "codex";

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openclaw: "OpenClaw",
  hermes:   "Hermes",
  claude:   "Claude",
  codex:    "Codex",
};

// ─── Provider config (stored in localStorage) ─────────────────────────────────

export interface ProviderConfig {
  type: ProviderType;
  /**
   * For gateway-style providers: WebSocket URL (ws:// or wss://)
   */
  gatewayUrl?: string;
  /**
   * Optional auth token / bearer for the gateway
   */
  authToken?: string;
  /**
   * Provider-specific extras (role, scopes, etc.)
   */
  extras?: Record<string, string>;
  /** ISO timestamp of last successful connection */
  lastConnectedAt?: string;
}

// ─── Health / connectivity ────────────────────────────────────────────────────

export type CheckLevel = "info" | "warn" | "error";

export interface ProviderCheck {
  code: string;
  level: CheckLevel;
  message: string;
  hint?: string;
}

export interface ProviderHealthResult {
  ok: boolean;
  latencyMs?: number;
  message: string;
  checks: ProviderCheck[];
  testedAt: string;
}

// ─── Run lifecycle ────────────────────────────────────────────────────────────

export interface ProviderRunOptions {
  instanceId: string;
  instanceName: string;
  steps: Array<{ id: string; name: string }>;
  /** Assigned agents from the instance */
  agentAssignments?: Array<{ role: string; agentId: string; agentName: string }>;
}

export interface ProviderRunResult {
  /** GRACE-local run ID */
  runId: string;
  startedAt: string;
  status: "started" | "queued" | "failed";
  message?: string;
  /** Provider-native run ID, if the provider returned one */
  providerRunId?: string;
}

export interface ProviderSendResult {
  ok: boolean;
  message?: string;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface IProvider {
  readonly type: ProviderType;
  readonly label: string;
  /** True iff the config has enough data to attempt a connection */
  isConfigured(config: ProviderConfig): boolean;
  /** Test connectivity — always resolves (never rejects) */
  healthCheck(config: ProviderConfig): Promise<ProviderHealthResult>;
  /** Initiate a run — always resolves (failed runs get status:"failed") */
  startRun(config: ProviderConfig, opts: ProviderRunOptions): Promise<ProviderRunResult>;
  /**
   * Send a user message to an active run.
   * Optional — not all providers support interactive chat.
   */
  sendChat?(config: ProviderConfig, runId: string, message: string): Promise<ProviderSendResult>;
}

// ─── Run record (stored locally per instance) ─────────────────────────────────

export type RunStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

export type StepStatus = "idle" | "ready" | "running" | "waiting" | "human_review" | "completed" | "failed";

export interface RunStepRecord {
  stepId: string;
  stepName: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface RunEvent {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  tag: string;
  message: string;
}

export interface RunRecord {
  /** GRACE-local run ID (uuid format) */
  id: string;
  instanceId: string;
  instanceName: string;
  /** Provider-native run ID, if available */
  providerRunId?: string;
  providerType: ProviderType;
  status: RunStatus;
  steps: RunStepRecord[];
  events: RunEvent[];
  /** Chat messages (user + agent) */
  chatMessages: ChatMessage[];
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
}
