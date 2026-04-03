/**
 * GRACE Server Routes
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
 *     Phase 8: Fires a real OpenClaw execute() call async and returns
 *     immediately with a server-side runId.
 *     Body: { url: string; authToken?: string; instanceId: string;
 *             instanceName?: string; task?: string }
 *     Returns: { runId: string; status: "running"; startedAt: string }
 *
 *   GET /api/grace/run/:runId/poll
 *     Phase 8: Returns current state of a dispatched run (events, status).
 *     Returns: GraceRunPollResult
 *
 * In-process run store: sufficient for Phase 8 single-server testing.
 * TODO (Phase 9): Persist run state to DB via packages/db.
 */

import { Router } from "express";
import { randomUUID } from "node:crypto";
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

      const result = await testEnvironment({
        companyId: "grace",
        adapterType: "openclaw-gateway",
        config,
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown probe error";
      res.status(500).json({
        adapterType: "openclaw-gateway",
        status: "fail",
        checks: [{ code: "probe_internal_error", level: "error", message: `Server-side probe failed: ${message}` }],
        testedAt: new Date().toISOString(),
      });
    }
  });

  // ── Run dispatch (Phase 8) ───────────────────────────────────────────────
  router.post("/run/dispatch", async (req, res) => {
    const body = req.body as {
      url?: unknown;
      authToken?: unknown;
      instanceId?: unknown;
      instanceName?: unknown;
      task?: unknown;
    };

    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url || (!url.startsWith("ws://") && !url.startsWith("wss://"))) {
      res.status(400).json({
        error: "GRACE run dispatch requires a valid ws:// or wss:// gateway URL.",
      });
      return;
    }

    const instanceId = typeof body.instanceId === "string" ? body.instanceId : "grace-instance";
    const instanceName = typeof body.instanceName === "string" ? body.instanceName : "GRACE Instance";
    const task = typeof body.task === "string" ? body.task : "Execute GRACE workflow";

    const runId = randomUUID();
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

    // Fire-and-don't-await — execute is long-running
    void (async () => {
      try {
        appendEvent(state, "system", `GRACE run ${runId} dispatched at ${startedAt}`);
        appendEvent(state, "system", `Instance: ${instanceName} (${instanceId})`);
        appendEvent(state, "system", `Task: ${task}`);

        const config: Record<string, unknown> = { url };
        if (typeof body.authToken === "string" && body.authToken.trim()) {
          config.authToken = body.authToken.trim();
        }

        const result = await execute({
          runId,
          agent: {
            id: `grace-agent-${instanceId}`,
            companyId: "grace",
            name: instanceName,
            adapterType: "openclaw-gateway",
            adapterConfig: config,
          },
          runtime: {
            sessionId: null,
            sessionParams: { sessionStrategy: "run" },
            sessionDisplayId: null,
            taskKey: `grace:${instanceId}`,
          },
          config,
          context: { task, instanceId, instanceName },
          onLog: async (stream, chunk) => {
            appendEvent(state, stream as "stdout" | "stderr", chunk);
          },
        });

        state.exitCode = result.exitCode;
        state.errorMessage = result.errorMessage ?? undefined;
        state.completedAt = new Date().toISOString();
        state.status = result.exitCode === 0 ? "completed" : "failed";
        appendEvent(
          state,
          "system",
          `Run ${state.status} (exit ${state.exitCode ?? "?"}) at ${state.completedAt}` +
            (result.errorMessage ? ` — ${result.errorMessage}` : ""),
        );
      } catch (err) {
        state.status = "failed";
        state.completedAt = new Date().toISOString();
        state.errorMessage = err instanceof Error ? err.message : "Unknown execution error";
        appendEvent(state, "system", `Run failed: ${state.errorMessage}`);
      }
    })();

    res.json({
      runId,
      status: "running",
      startedAt,
      message: `Run dispatched. Poll /api/grace/run/${runId}/poll for updates.`,
    });
  });

  // ── Run poll (Phase 8) ───────────────────────────────────────────────────
  router.get("/run/:runId/poll", (req, res) => {
    const { runId } = req.params;
    const state = runStore.get(runId);

    if (!state) {
      res.status(404).json({ error: `Run ${runId} not found in server store.` });
      return;
    }

    res.json({
      runId: state.runId,
      instanceId: state.instanceId,
      status: state.status,
      startedAt: state.startedAt,
      completedAt: state.completedAt ?? null,
      exitCode: state.exitCode ?? null,
      errorMessage: state.errorMessage ?? null,
      events: state.events.slice(-50),
      totalEvents: state.events.length,
    });
  });

  return router;
}
