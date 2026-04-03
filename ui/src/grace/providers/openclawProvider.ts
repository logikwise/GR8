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

    // Phase 5: Probe GRACE server reachability as a proxy.
    // Full gateway WebSocket probe runs server-side via the preserved
    // openclaw-gateway adapter. That route is deferred to Phase 6.
    // TODO (Phase 6): call POST /api/grace/provider/openclaw/test instead.
    const serverCheck: ProviderCheck = await (async () => {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          return {
            code: "grace_server_reachable",
            level: "info" as const,
            message: "GRACE server is reachable.",
          };
        }
        return {
          code: "grace_server_error",
          level: "warn" as const,
          message: `GRACE server returned status ${res.status}.`,
        };
      } catch {
        return {
          code: "grace_server_unreachable",
          level: "warn" as const,
          message: "GRACE server not reachable — gateway probe skipped.",
          hint: "Ensure the backend server is running.",
        };
      }
    })();

    const gatewayProbeNote: ProviderCheck = {
      code: "openclaw_gateway_probe_deferred",
      level: "info",
      message: "Gateway WebSocket probe runs server-side (Phase 6 integration).",
      hint: "The openclaw-gateway adapter is preserved in packages/adapters/openclaw-gateway.",
    };

    const allChecks = [...configChecks, serverCheck, gatewayProbeNote];
    const latencyMs = Date.now() - start;
    const hasError = allChecks.some((c) => c.level === "error");

    return {
      ok: !hasError,
      latencyMs,
      message: hasError
        ? "Configuration errors found — resolve before connecting."
        : "Configuration looks valid. Full gateway probe is a Phase 6 feature.",
      checks: allChecks,
      testedAt: new Date().toISOString(),
    };
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

    // Phase 5: Local run record — execution via gateway is Phase 6.
    // TODO (Phase 6): POST /api/grace/provider/openclaw/run
    // Reuse: packages/adapters/openclaw-gateway/src/server/execute.ts
    const runId = randomId();
    return {
      runId,
      startedAt: new Date().toISOString(),
      status: "started",
      message:
        "Run record created locally. Full execution via OpenClaw gateway is wired in Phase 6. " +
        "Preserved adapter: packages/adapters/openclaw-gateway.",
      providerRunId: undefined,
    };
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
