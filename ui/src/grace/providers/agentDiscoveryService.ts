/**
 * Agent Discovery Service — Phase 9
 *
 * Attempts to enumerate available agents from the configured provider.
 * Currently the OpenClaw gateway adapter does NOT expose a listing endpoint,
 * so this returns { discoverable: false, agents: [] } honestly.
 * The infrastructure (server route + caching) is in place for future phases.
 *
 * Server route: POST /api/grace/provider/openclaw/agents
 */

import type { ProviderConfig, AgentDiscoveryResult, DiscoveredAgent } from "./providerTypes";

const DISCOVERY_KEY = "grace.agents.v1";

export const agentDiscoveryService = {
  /**
   * Attempt to discover agents from an OpenClaw provider.
   * Always resolves — never rejects.
   */
  async discoverAgents(config: ProviderConfig): Promise<AgentDiscoveryResult> {
    const url = config.gatewayUrl?.trim() ?? "";
    if (!url) {
      return this._notAvailable("No gateway URL configured.");
    }

    try {
      const res = await fetch("/api/grace/provider/openclaw/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          authToken: config.authToken?.trim() ?? "",
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return this._notAvailable(
          `Agent discovery endpoint returned HTTP ${res.status}.`,
        );
      }

      const data = await res.json() as {
        discoverable?: boolean;
        agents?: unknown[];
        reason?: string;
        discoveredAt?: string;
      };

      const discoveredAt = data.discoveredAt ?? new Date().toISOString();

      if (!data.discoverable) {
        const result: AgentDiscoveryResult = {
          discoverable: false,
          agents: [],
          reason: data.reason ?? "Agent listing is not yet supported by this gateway version.",
          discoveredAt,
        };
        this._save(result);
        return result;
      }

      const agents: DiscoveredAgent[] = (Array.isArray(data.agents) ? data.agents : [])
        .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
        .map((a) => ({
          id:              String(a.id ?? a.providerAgentId ?? ""),
          providerAgentId: String(a.providerAgentId ?? a.id ?? ""),
          provider:        config.type,
          name:            String(a.name ?? a.id ?? "Unknown agent"),
          type:            String(a.type ?? "unknown"),
          status:          (["available","busy","offline","unknown"] as const)
                             .includes(a.status as never)
                             ? (a.status as DiscoveredAgent["status"])
                             : "unknown",
        }));

      const result: AgentDiscoveryResult = {
        discoverable: true,
        agents,
        discoveredAt,
      };
      this._save(result);
      return result;

    } catch {
      return this._notAvailable("Could not reach agent discovery endpoint.");
    }
  },

  /** Return the last cached discovery result, or null if never run */
  getLastDiscovery(): AgentDiscoveryResult | null {
    try {
      const raw = localStorage.getItem(DISCOVERY_KEY);
      return raw ? (JSON.parse(raw) as AgentDiscoveryResult) : null;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(DISCOVERY_KEY);
    } catch {/* ignore */}
  },

  _notAvailable(reason: string): AgentDiscoveryResult {
    const result: AgentDiscoveryResult = {
      discoverable: false,
      agents: [],
      reason,
      discoveredAt: new Date().toISOString(),
    };
    this._save(result);
    return result;
  },

  _save(result: AgentDiscoveryResult): void {
    try {
      localStorage.setItem(DISCOVERY_KEY, JSON.stringify(result));
    } catch {
      console.warn("[agentDiscoveryService] Could not persist discovery result.");
    }
  },
};
