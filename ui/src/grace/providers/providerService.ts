/**
 * Provider Service — Phase 5
 *
 * Singleton that manages the active provider configuration.
 * Config is stored in localStorage so it survives page reloads.
 *
 * Swap to a backend-persisted model by replacing load() / save()
 * with GET/POST calls to /api/grace/provider-config.
 */

import type { ProviderConfig, ProviderType } from "./providerTypes";
import { openclawProvider } from "./openclawProvider";
import type { IProvider } from "./providerTypes";

const STORAGE_KEY = "grace.provider.v1";

// ─── Provider registry ────────────────────────────────────────────────────────

const PROVIDER_REGISTRY: Record<ProviderType, IProvider> = {
  openclaw: openclawProvider,
  // TODO (Phase 6): register hermes, claude, codex providers when implemented
  hermes: _placeholder("hermes", "Hermes"),
  claude:  _placeholder("claude", "Claude"),
  codex:   _placeholder("codex", "Codex"),
};

function _placeholder(type: ProviderType, label: string): IProvider {
  return {
    type,
    label,
    isConfigured: () => false,
    healthCheck: async () => ({
      ok: false,
      message: `${label} provider is not yet implemented.`,
      checks: [{ code: "not_implemented", level: "warn", message: `${label} provider coming in a future phase.` }],
      testedAt: new Date().toISOString(),
    }),
    startRun: async () => ({
      runId: `run-${Date.now().toString(36)}`,
      startedAt: new Date().toISOString(),
      status: "failed",
      message: `${label} provider is not yet implemented.`,
    }),
  };
}

// ─── Config persistence ───────────────────────────────────────────────────────

function load(): ProviderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProviderConfig) : null;
  } catch {
    return null;
  }
}

function save(config: ProviderConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    console.warn("[providerService] Could not persist provider config.");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const providerService = {
  /** Get the stored config (may be null if never configured) */
  getConfig(): ProviderConfig | null {
    return load();
  },

  /** Save the config */
  setConfig(config: ProviderConfig | null): void {
    save(config);
  },

  /** Get the IProvider implementation for a given type */
  getProvider(type: ProviderType): IProvider {
    return PROVIDER_REGISTRY[type] ?? openclawProvider;
  },

  /** Get the active provider + config together (convenience) */
  getActive(): { provider: IProvider; config: ProviderConfig } | null {
    const config = load();
    if (!config) return null;
    const provider = PROVIDER_REGISTRY[config.type] ?? openclawProvider;
    return { provider, config };
  },

  /** True iff a valid provider is configured */
  isConnected(): boolean {
    const active = this.getActive();
    if (!active) return false;
    return active.provider.isConfigured(active.config);
  },

  /** List all available provider types (for the picker UI) */
  availableTypes(): ProviderType[] {
    return ["openclaw", "hermes", "claude", "codex"];
  },
};
