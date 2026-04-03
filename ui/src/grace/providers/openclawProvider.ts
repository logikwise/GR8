/**
 * OpenClaw Provider — Phase 5
 *
 * First concrete implementation of IProvider.
 *
 * Connection model:
 *   OpenClaw uses a WebSocket gateway with device-auth (Ed25519).
 *   The gateway probe (testEnvironment) runs server-side via the
 *   @paperclipai/adapter-openclaw-gateway package — see:
 *     packages/adapters/openclaw-gateway/src/server/test.ts
 *
 * For this phase (UI-side abstraction):
 *   - Config is stored in localStorage via providerService.
 *   - healthCheck() does a lightweight server-side ping via
 *     GET /api/health and validates config format locally.
 *   - startRun() creates a local RunRecord immediately and marks the
 *     instance as running. Full gateway execution requires a new
 *     backend route (POST /api/grace/provider/openclaw/run) — deferred.
 *
 * TODO (Phase 6):
 *   - Add POST /api/grace/provider/openclaw/test route that calls
 *     packages/adapters/openclaw-gateway/src/server/test.ts#testEnvironment
 *   - Add POST /api/grace/provider/openclaw/run route that calls
 *     packages/adapters/openclaw-gateway/src/server/execute.ts#execute
 *   - Stream run events back via SSE or WebSocket
 *
 * GRACE-REVIEW: The adapter already exists; this file wraps it at the UI
 * abstraction boundary. Do NOT duplicate gateway protocol logic here.
 */

import type {
  IProvider,
  ProviderConfig,
  ProviderHealthResult,
  ProviderRunOptions,
  ProviderRunResult,
  ProviderSendResult,
  ProviderCheck,
} from "./providerTypes";

function randomId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildConfigChecks(config: ProviderConfig): ProviderCheck[] {
  const checks: ProviderCheck[] = [];

  const url = config.gatewayUrl?.trim();

  if (!url) {
    checks.push({
      code: "openclaw_url_missing",
      level: "error",
      message: "Gateway URL is required.",
      hint: "Set a WebSocket URL (ws:// or wss://).",
    });
    return checks;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    checks.push({
      code: "openclaw_url_invalid",
      level: "error",
      message: `Invalid URL: ${url}`,
    });
    return checks;
  }

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    checks.push({
      code: "openclaw_url_protocol",
      level: "error",
      message: `URL must start with ws:// or wss://, got: ${parsed.protocol}`,
    });
    return checks;
  }

  checks.push({
    code: "openclaw_url_ok",
    level: "info",
    message: `Gateway URL: ${parsed.toString()}`,
  });

  if (parsed.protocol === "ws:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    checks.push({
      code: "openclaw_url_plaintext_remote",
      level: "warn",
      message: "Using plaintext ws:// on a non-loopback host.",
      hint: "Prefer wss:// for remote gateways.",
    });
  }

  if (config.authToken?.trim()) {
    checks.push({
      code: "openclaw_auth_present",
      level: "info",
      message: "Auth token is configured.",
    });
  } else {
    checks.push({
      code: "openclaw_auth_missing",
      level: "warn",
      message: "No auth token configured.",
      hint: "Set an auth token for authenticated gateways.",
    });
  }

  return checks;
}

export const openclawProvider: IProvider = {
  type: "openclaw",
  label: "OpenClaw",

  isConfigured(config: ProviderConfig): boolean {
    const url = config.gatewayUrl?.trim() ?? "";
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "ws:" || parsed.protocol === "wss:";
    } catch {
      return false;
    }
  },

  async healthCheck(config: ProviderConfig): Promise<ProviderHealthResult> {
    const start = Date.now();
    const configChecks = buildConfigChecks(config);
    const hasConfigError = configChecks.some((c) => c.level === "error");

    if (hasConfigError) {
      return {
        ok: false,
        message: "Gateway configuration is invalid.",
        checks: configChecks,
        testedAt: new Date().toISOString(),
      };
    }

    // Call the real server-side gateway probe via the openclaw-gateway adapter.
    // Route: POST /api/grace/provider/openclaw/probe (added in Phase 7)
    // The server uses testEnvironment() from packages/adapters/openclaw-gateway/src/server/test.ts
    // to perform a real WebSocket connectivity check.
    try {
      const res = await fetch("/api/grace/provider/openclaw/probe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.gatewayUrl?.trim() ?? "",
          authToken: config.authToken?.trim() ?? "",
        }),
        signal: AbortSignal.timeout(12000),
      });

      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          ok: false,
          latencyMs,
          message: `Probe request failed (HTTP ${res.status}). Check that the GRACE backend is running.`,
          checks: [
            ...configChecks,
            {
              code: "probe_http_error",
              level: "error" as const,
              message: `Server returned HTTP ${res.status}.`,
              hint: "Ensure the backend server is running.",
            },
          ],
          testedAt: new Date().toISOString(),
        };
      }

      const probeResult = await res.json() as {
        status: string;
        checks: Array<{ code: string; level: string; message: string; hint?: string }>;
        testedAt: string;
      };

      const gatewayChecks: ProviderCheck[] = (probeResult.checks ?? []).map((c) => ({
        code: c.code,
        level: (c.level === "error" || c.level === "warn" ? c.level : "info") as ProviderCheck["level"],
        message: c.message,
        ...(c.hint ? { hint: c.hint } : {}),
      }));

      const allChecks: ProviderCheck[] = [...configChecks, ...gatewayChecks];
      const hasError = probeResult.status === "fail" || allChecks.some((c) => c.level === "error");
      const hasWarn = probeResult.status === "warn" || allChecks.some((c) => c.level === "warn");

      return {
        ok: !hasError,
        latencyMs,
        message: hasError
          ? "Gateway probe failed — check configuration and gateway availability."
          : hasWarn
          ? "Gateway probe passed with warnings."
          : "Gateway probe passed — OpenClaw is reachable.",
        checks: allChecks,
        testedAt: probeResult.testedAt ?? new Date().toISOString(),
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const isTimeout = err instanceof Error && err.name === "TimeoutError";
      return {
        ok: false,
        latencyMs,
        message: isTimeout
          ? "Gateway probe timed out (12s). The backend server may be unreachable."
          : "Gateway probe request failed. Check that the GRACE backend is running.",
        checks: [
          ...configChecks,
          {
            code: "probe_fetch_error",
            level: "error" as const,
            message: isTimeout ? "Probe timed out after 12 seconds." : "Network error reaching the probe endpoint.",
            hint: "Ensure the backend server is running on the expected port.",
          },
        ],
        testedAt: new Date().toISOString(),
      };
    }
  },

  async startRun(config: ProviderConfig, opts: ProviderRunOptions): Promise<ProviderRunResult> {
    if (!this.isConfigured(config)) {
      return {
        runId: randomId(),
        startedAt: new Date().toISOString(),
        status: "failed",
        message: "OpenClaw provider is not configured. Set a gateway URL in Connections.",
      };
    }

    // Phase 8: Call real server dispatch — POST /api/grace/run/dispatch
    // Server fires packages/adapters/openclaw-gateway/src/server/execute.ts async,
    // returns a providerRunId immediately. UI polls /api/grace/run/:id/poll for state.
    try {
      const res = await fetch("/api/grace/run/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: config.gatewayUrl?.trim() ?? "",
          authToken: config.authToken?.trim() ?? "",
          instanceId: opts.instanceId,
          instanceName: opts.instanceName ?? opts.instanceId,
          task: opts.steps?.map((s) => s.name).join(" → ") ?? "Execute GRACE workflow",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json() as { runId: string; status: string; startedAt: string; message?: string };
        const localRunId = randomId();
        return {
          runId: localRunId,
          startedAt: data.startedAt,
          status: "started",
          providerRunId: data.runId,
          message: data.message ?? `OpenClaw run dispatched. Provider run ID: ${data.runId}`,
        };
      }

      // Server returned an error — fall through to local-only fallback
      const errBody = await res.json().catch(() => ({})) as { error?: string };
      return {
        runId: randomId(),
        startedAt: new Date().toISOString(),
        status: "failed",
        message: `Dispatch failed (HTTP ${res.status}): ${errBody.error ?? "Unknown error"}`,
      };
    } catch (err) {
      // Network error or timeout — fall back to local-only mode with clear messaging
      const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
      return {
        runId: randomId(),
        startedAt: new Date().toISOString(),
        status: "started",
        providerRunId: undefined,
        message: isTimeout
          ? "Server dispatch timed out. Running in local-only mode. Check that the backend is running."
          : "Could not reach backend dispatch endpoint. Running in local-only mode.",
      };
    }
  },

  async sendChat(
    _config: ProviderConfig,
    _runId: string,
    _message: string,
  ): Promise<ProviderSendResult> {
    // TODO (Phase 6): Send user input to the active gateway run session.
    return {
      ok: false,
      message: "Interactive chat input requires Phase 6 gateway integration.",
    };
  },
};
