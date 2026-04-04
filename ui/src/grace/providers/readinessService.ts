/**
 * Readiness Service — derives ProviderReadiness from probe check codes.
 *
 * The probe can distinguish:
 *   openclaw_gateway_probe_ok             → reachable + paired
 *   openclaw_gateway_probe_challenge_only → reachable, pairing REJECTED
 *   openclaw_gateway_probe_failed/error   → not reachable
 *
 * Readiness is cached in localStorage so it survives page reload and can be
 * consulted during preflight without a fresh probe on every Start Run click.
 */

import type { ProviderHealthResult, ProviderReadiness, AgentDiscoveryResult } from "./providerTypes";

const READINESS_KEY = "grace.readiness.v1";

// ─── Inference ─────────────────────────────────────────────────────────────────

export function inferReadiness(healthResult: ProviderHealthResult): ProviderReadiness {
  const checks = healthResult.checks;

  const networkFailed = checks.some((c) =>
    c.code === "probe_fetch_error" ||
    c.code === "probe_http_error" ||
    c.code === "openclaw_gateway_probe_failed" ||
    c.code === "openclaw_gateway_probe_error" ||
    c.code === "openclaw_gateway_url_missing" ||
    c.code === "openclaw_gateway_url_invalid" ||
    c.code === "openclaw_url_missing" ||
    c.code === "openclaw_url_invalid",
  );

  const challengeOnly = checks.some(
    (c) => c.code === "openclaw_gateway_probe_challenge_only",
  );
  const probeOk = checks.some(
    (c) => c.code === "openclaw_gateway_probe_ok",
  );

  const reachable = !networkFailed && (probeOk || challengeOnly);
  const paired    = probeOk && !challengeOnly;

  // agentsAvailable is updated separately by agentDiscoveryService
  const agentsAvailable = false;
  const executionReady  = reachable && paired;

  let details: string;
  if (!reachable && networkFailed) {
    details = "Provider is not reachable. Check the gateway URL and network connectivity.";
  } else if (!reachable) {
    details = "Provider check failed. Review gateway URL and server status.";
  } else if (challengeOnly) {
    details =
      "Gateway reached but pairing was rejected. Approve this device in OpenClaw, then retest.";
  } else if (probeOk) {
    details = "Provider is connected and paired. Ready to dispatch.";
  } else {
    details = healthResult.message;
  }

  return {
    reachable,
    paired,
    agentsAvailable,
    executionReady,
    lastCheckedAt: healthResult.testedAt,
    details,
    checkResult: healthResult,
  };
}

// ─── Merge agent availability into cached readiness ────────────────────────────

export function mergeAgentAvailability(
  readiness: ProviderReadiness,
  discovery: AgentDiscoveryResult,
): ProviderReadiness {
  const agentsAvailable = discovery.discoverable && discovery.agents.length > 0;
  return { ...readiness, agentsAvailable };
}

// ─── Cache ─────────────────────────────────────────────────────────────────────

export const readinessService = {
  /** Derive, persist, and return readiness from a fresh health result */
  fromHealthResult(healthResult: ProviderHealthResult): ProviderReadiness {
    const r = inferReadiness(healthResult);
    this.save(r);
    return r;
  },

  getLastReadiness(): ProviderReadiness | null {
    try {
      const raw = localStorage.getItem(READINESS_KEY);
      return raw ? (JSON.parse(raw) as ProviderReadiness) : null;
    } catch {
      return null;
    }
  },

  save(r: ProviderReadiness): void {
    try {
      // Don't serialize the full checkResult into the cache to keep it compact.
      const { checkResult: _, ...cacheable } = r;
      localStorage.setItem(READINESS_KEY, JSON.stringify(cacheable));
    } catch {
      console.warn("[readinessService] Could not persist readiness.");
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(READINESS_KEY);
    } catch {/* ignore */}
  },
};
