/**
 * GRACE Server Routes — Runtime Bridge Layer
 *
 * Mounts at /api/grace/* via app.ts.
 *
 * Routes:
 *   POST /api/grace/provider/openclaw/probe
 *     WebSocket connectivity check via testEnvironment().
 *     Body: { url: string; authToken?: string }
 *     Returns: AdapterEnvironmentTestResult
 *
 *   POST /api/grace/run/dispatch
 *     Fires a real OpenClaw execute() call async and returns
 *     immediately with a server-side runId.
 *     Body: { url: string; authToken?: string; instanceId: string;
 *             instanceName?: string; task?: string }
 *     Returns: { runId: string; status: "running"; startedAt: string }
 *
 *   GET /api/grace/run/:runId/poll
 *     Returns current state of a dispatched run (events, status).
 *     Returns: GraceRunPollResult
 *
 * ─── Compatibility notes ─────────────────────────────────────────────────────
 * The adapter package (@paperclipai/adapter-openclaw-gateway) uses PAPERCLIP_*
 * environment variable names internally (PAPERCLIP_RUN_ID, PAPERCLIP_AGENT_ID,
 * PAPERCLIP_COMPANY_ID, etc.) and session keys like "paperclip:run:<id>".
 * These are in the PRESERVED adapter internals and MUST NOT be changed here.
 *
 * This bridge layer uses neutral field names in its own event messages and
 * context objects (APP_RUN_ID, APP_INSTANCE_ID, etc.). The adapter receives
 * these alongside its own required fields and ignores unrecognized ones.
 *
 * See: docs/runtime-translation-layer.md for full compatibility map.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * In-process run store: sufficient for single-server testing.
 * TODO (next): Persist run state to DB via packages/db.
 */

import { Router } from "express";
import { randomUUID } from "node:crypto";
// @paperclipai/adapter-openclaw-gateway is the preserved runtime package name.
// The "paperclipai" npm scope is the package publisher — this is not a product coupling.
import { testEnvironment, execute } from "@paperclipai/adapter-openclaw-gateway/server";

// ---------------------------------------------------------------------------
// In-process run state store
// ---------------------------------------------------------------------------

export type GraceRunEvent = {
  t: string;
  stream: "stdout" | "stderr" | "system";
  chunk: string;
};

export type GraceRunState = {
  runId: string;
  instanceId: string;
  instanceName: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  events: GraceRunEvent[];
  exitCode?: number | null;
  errorMessage?: string;
};

// Keyed by server-side runId (UUID)
const runStore = new Map<string, GraceRunState>();

// Cap at 500 events per run to avoid unbounded memory growth
const MAX_EVENTS = 500;

function appendEvent(state: GraceRunState, stream: GraceRunEvent["stream"], chunk: string) {
  if (state.events.length >= MAX_EVENTS) state.events.shift();
  state.events.push({ t: new Date().toISOString(), stream, chunk });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function graceRoutes(): Router {
  const router = Router();

  // ── Probe ────────────────────────────────────────────────────────────────
  router.post("/provider/openclaw/probe", async (req, res) => {
    try {
      const { url, authToken } = req.body as { url?: unknown; authToken?: unknown };

      const config: Record<string, unknown> = {};
      if (typeof url === "string" && url.trim()) config.url = url.trim();
      if (typeof authToken === "string" && authToken.trim()) config.authToken = authToken.trim();

      // companyId is required by the adapter type. Value is workspace-scoped identifier.
      // Compat: adapter uses this as PAPERCLIP_COMPANY_ID in the agent environment.
      const result = await testEnvironment({
        companyId: "workspace",
        adapterType: "openclaw-gateway",
        config,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown probe error";
      res.status(500).json({
        adapterType: "openclaw-gateway",
        status: "fail",
        checks: [{ code: "probe_internal_error", level: "error", message: `Provider probe failed: ${message}` }],
        testedAt: new Date().toISOString(),
      });
    }
  });

  // ── Run dispatch ─────────────────────────────────────────────────────────
  router.post("/run/dispatch", async (req, res) => {
    const body = req.body as {
      url?: unknown;
      authToken?: unknown;
      instanceId?: unknown;
      instanceName?: unknown;
      task?: unknown;
      inputAssetIds?: unknown;
    };

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url || (!url.startsWith("ws://") && !url.startsWith("wss://"))) {
      res.status(400).json({
        error: "Run dispatch requires a valid ws:// or wss:// provider gateway URL.",
      });
      return;
    }

    const instanceId    = typeof body.instanceId   === "string" ? body.instanceId   : "default-instance";
    const instanceName  = typeof body.instanceName  === "string" ? body.instanceName : "Workflow Instance";
    const task          = typeof body.task          === "string" ? body.task         : "Execute workflow";
    const inputAssetIds = Array.isArray(body.inputAssetIds)
      ? (body.inputAssetIds as unknown[]).filter((x): x is string => typeof x === "string")
      : [];

    const runId     = randomUUID();
    const startedAt = new Date().toISOString();

    const state: GraceRunState = {
      runId,
      instanceId,
      instanceName,
      status: "running",
      startedAt,
      events: [],
    };
    runStore.set(runId, state);

    // Fire-and-don't-await — execute() is long-running
    void (async () => {
      try {
        // System events appear in the Logs tab — use neutral runtime language.
        appendEvent(state, "system", `Runtime activation dispatched — run ${runId} (${startedAt})`);
        appendEvent(state, "system", `Workflow instance: ${instanceName} (${instanceId})`);
        appendEvent(state, "system", `Execution context: ${task}`);

        const config: Record<string, unknown> = { url };
        if (typeof body.authToken === "string" && body.authToken.trim()) {
          config.authToken = body.authToken.trim();
        }

        const result = await execute({
          runId,
          agent: {
            // id prefix "agent-" is neutral; avoids product-name coupling.
            id: `agent-${instanceId}`,
            // companyId is required by the adapter type. "workspace" is the neutral value.
            // Compat: adapter maps this → PAPERCLIP_COMPANY_ID in the agent env.
            companyId: "workspace",
            name: instanceName,
            adapterType: "openclaw-gateway",
            adapterConfig: config,
          },
          runtime: {
            sessionId: null,
            sessionParams: { sessionStrategy: "run" },
            sessionDisplayId: null,
            // taskKey scopes the session; "run:" prefix is neutral.
            taskKey: `run:${instanceId}`,
          },
          config,
          context: {
            // Legacy adapter-compat context fields (used by buildWakePayload in the adapter)
            task,
            instanceId,
            instanceName,
            // Neutral APP_* context fields for forward-compatible runtime bridge.
            // The adapter ignores unrecognized context keys; these are available for
            // future bridge logic without coupling to PAPERCLIP_* internals.
            APP_RUN_ID: runId,
            APP_INSTANCE_ID: instanceId,
            APP_WORKSPACE_ID: "default",
            APP_TRACE_ID: runId,
            APP_PROVIDER: "openclaw",
            APP_INPUT_ASSET_IDS: inputAssetIds.join(","),
          },
          onLog: async (stream, chunk) => {
            appendEvent(state, stream as "stdout" | "stderr", chunk);
          },
        });

        state.exitCode     = result.exitCode;
        state.errorMessage = result.errorMessage ?? undefined;
        state.completedAt  = new Date().toISOString();
        state.status       = result.exitCode === 0 ? "completed" : "failed";
        appendEvent(
          state,
          "system",
          `Execution ${state.status} — exit code ${state.exitCode ?? "?"} at ${state.completedAt}` +
            (result.errorMessage ? ` — ${result.errorMessage}` : ""),
        );
      } catch (err) {
        state.status       = "failed";
        state.completedAt  = new Date().toISOString();
        state.errorMessage = err instanceof Error ? err.message : "Unknown execution error";
        appendEvent(state, "system", `Execution failed: ${state.errorMessage}`);
      }
    })();

    res.json({
      runId,
      status: "running",
      startedAt,
      message: `Runtime activation dispatched. Poll /api/grace/run/${runId}/poll for status updates.`,
    });
  });

  // ── Run poll ─────────────────────────────────────────────────────────────
  router.get("/run/:runId/poll", (req, res) => {
    const { runId } = req.params;
    const state = runStore.get(runId);

    if (!state) {
      res.status(404).json({ error: `Run ${runId} not found in server run store.` });
      return;
    }

    res.json({
      runId:        state.runId,
      instanceId:   state.instanceId,
      status:       state.status,
      startedAt:    state.startedAt,
      completedAt:  state.completedAt ?? null,
      exitCode:     state.exitCode ?? null,
      errorMessage: state.errorMessage ?? null,
      events:       state.events.slice(-50),
      totalEvents:  state.events.length,
    });
  });

  return router;
}
