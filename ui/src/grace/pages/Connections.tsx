/**
 * Connections — Phase 7
 *
 * Provider configuration, health-check, and capability display surface.
 * OpenClaw is the first live provider; others are typed placeholders.
 *
 * Architecture:
 *   Config → localStorage via providerService (replaceable with backend).
 *   Health check → openclawProvider.healthCheck() → POST /api/grace/provider/openclaw/probe
 *     which calls testEnvironment() from packages/adapters/openclaw-gateway/server (real probe).
 *   Capabilities → ProviderCapabilities per provider (honest status display).
 */

import { useState, useEffect } from "react";
import {
  Plug, Wifi, WifiOff, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Loader, X, Save, RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { providerService } from "../providers/providerService";
import { PROVIDER_LABELS } from "../providers/providerTypes";
import type { ProviderConfig, ProviderType, ProviderHealthResult, ProviderCapabilities } from "../providers/providerTypes";

const PROVIDER_DESCRIPTIONS: Record<ProviderType, string> = {
  openclaw: "WebSocket gateway adapter. Connects GRACE to an OpenClaw agent backend via device-auth. See packages/adapters/openclaw-gateway.",
  hermes:   "Hermes provider — architecture reserved. Implementation coming in a future phase.",
  claude:   "Claude (Anthropic) provider — architecture reserved. Uses preserved packages/adapters/claude-local plumbing.",
  codex:    "Codex (OpenAI) provider — architecture reserved. Uses preserved packages/adapters/codex-local plumbing.",
};

// Per-provider capability declarations — honest about what is actually wired.
// "live" = working now, "planned" = adapter exists but not yet wired, "none" = not planned
type CapabilityStatus = "live" | "planned" | "none";

interface CapabilityEntry {
  key: keyof ProviderCapabilities;
  label: string;
  description: string;
}

const CAPABILITY_ENTRIES: CapabilityEntry[] = [
  { key: "healthCheck",     label: "Health check",      description: "Test connectivity to the provider" },
  { key: "runDispatch",     label: "Run dispatch",       description: "Start an agent execution run" },
  { key: "eventStream",     label: "Event stream",       description: "Real-time events via WebSocket/SSE" },
  { key: "eventPoll",       label: "Event polling",      description: "Status updates via polling" },
  { key: "chatInteraction", label: "Interactive chat",   description: "Send messages to an active run" },
  { key: "agentDiscovery",  label: "Agent discovery",    description: "Enumerate available agents" },
  { key: "outputListing",   label: "Output listing",     description: "Retrieve artifacts from completed runs" },
];

const PROVIDER_CAPABILITIES: Record<ProviderType, Record<keyof ProviderCapabilities, CapabilityStatus>> = {
  openclaw: {
    healthCheck:     "live",     // POST /api/grace/provider/openclaw/probe — wired Phase 7
    runDispatch:     "planned",  // Local run record created; gateway execution = Phase 6
    eventStream:     "planned",  // WebSocket event stream via gateway — Phase 6
    eventPoll:       "none",     // Not planned
    chatInteraction: "planned",  // Requires Phase 6 gateway run session
    agentDiscovery:  "planned",  // Via gateway protocol — Phase 6+
    outputListing:   "planned",  // Via gateway protocol — Phase 6+
  },
  hermes: {
    healthCheck:     "none",
    runDispatch:     "none",
    eventStream:     "none",
    eventPoll:       "none",
    chatInteraction: "none",
    agentDiscovery:  "none",
    outputListing:   "none",
  },
  claude: {
    healthCheck:     "none",
    runDispatch:     "none",
    eventStream:     "none",
    eventPoll:       "none",
    chatInteraction: "none",
    agentDiscovery:  "none",
    outputListing:   "none",
  },
  codex: {
    healthCheck:     "none",
    runDispatch:     "none",
    eventStream:     "none",
    eventPoll:       "none",
    chatInteraction: "none",
    agentDiscovery:  "none",
    outputListing:   "none",
  },
};

function CapabilityMatrix({ providerType }: { providerType: ProviderType }) {
  const caps = PROVIDER_CAPABILITIES[providerType];
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-3 mt-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap size={11} className="text-muted-foreground/50" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Capabilities
        </p>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {CAPABILITY_ENTRIES.map(({ key, label, description }) => {
          const status = caps[key];
          return (
            <div key={key} className="flex items-center gap-2" title={description}>
              <span className={cn(
                "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                status === "live"    ? "bg-emerald-500" :
                status === "planned" ? "bg-amber-400" :
                "bg-muted-foreground/20",
              )} />
              <span className={cn(
                "text-[10px] flex-1",
                status === "live"    ? "text-foreground/80" :
                status === "planned" ? "text-muted-foreground/60" :
                "text-muted-foreground/30",
              )}>
                {label}
              </span>
              <span className={cn(
                "text-[9px] uppercase tracking-wide font-medium shrink-0",
                status === "live"    ? "text-emerald-600" :
                status === "planned" ? "text-amber-500/80" :
                "text-muted-foreground/25",
              )}>
                {status === "live" ? "live" : status === "planned" ? "planned" : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Live
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Planned
        </span>
        <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 inline-block" /> Not planned
        </span>
      </div>
    </div>
  );
}

type CheckLevel = "info" | "warn" | "error";

const LEVEL_ICON: Record<CheckLevel, React.ReactNode> = {
  info:  <CheckCircle  size={12} className="text-emerald-500 shrink-0" />,
  warn:  <AlertTriangle size={12} className="text-amber-500  shrink-0" />,
  error: <AlertTriangle size={12} className="text-destructive shrink-0" />,
};

function HealthResult({ result }: { result: ProviderHealthResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn(
      "rounded-lg border p-3 mt-2 text-xs",
      result.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5",
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {result.ok
            ? <Wifi size={13} className="text-emerald-500 shrink-0" />
            : <WifiOff size={13} className="text-destructive shrink-0" />}
          <span className={cn("font-medium", result.ok ? "text-emerald-600" : "text-destructive")}>
            {result.ok ? "Check passed" : "Check failed"}
          </span>
          {result.latencyMs !== undefined && (
            <span className="text-muted-foreground/50">{result.latencyMs}ms</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground/60 hover:text-foreground"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      <p className="mt-1 text-muted-foreground leading-snug">{result.message}</p>
      {expanded && result.checks.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.checks.map((c) => (
            <li key={c.code} className="flex items-start gap-1.5">
              {LEVEL_ICON[c.level]}
              <div>
                <span className="text-foreground/80">{c.message}</span>
                {c.hint && <span className="ml-1 text-muted-foreground/50">— {c.hint}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[10px] text-muted-foreground/40">
        Checked {new Date(result.testedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

function ProviderCard({
  type,
  active,
  config,
  onSelect,
}: {
  type: ProviderType;
  active: boolean;
  config: ProviderConfig | null;
  onSelect: () => void;
}) {
  const isOpenClaw = type === "openclaw";
  const isConfigured = config?.type === type && providerService.getProvider(type).isConfigured(config);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all text-xs",
        active
          ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)]"
          : "border-border bg-card hover:border-[var(--grace-accent)]/40",
        !isOpenClaw && "opacity-60 cursor-not-allowed",
      )}
      disabled={!isOpenClaw}
      title={!isOpenClaw ? "Available in a future phase" : undefined}
    >
      <div className="flex items-center justify-between">
        <span className={cn("font-semibold", active ? "text-[var(--grace-accent)]" : "text-foreground")}>
          {PROVIDER_LABELS[type]}
        </span>
        <div className="flex items-center gap-1.5">
          {isConfigured && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 uppercase">
              configured
            </span>
          )}
          {!isOpenClaw && (
            <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground uppercase">
              future
            </span>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-muted-foreground/70 leading-snug line-clamp-2">
        {PROVIDER_DESCRIPTIONS[type]}
      </p>
    </button>
  );
}

export function GraceConnections() {
  const [selectedType, setSelectedType] = useState<ProviderType>("openclaw");
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [healthResult, setHealthResult] = useState<ProviderHealthResult | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const stored = providerService.getConfig();
    setConfig(stored);
    if (stored?.type === "openclaw") {
      setGatewayUrl(stored.gatewayUrl ?? "");
      setAuthToken(stored.authToken ?? "");
    }
  }, []);

  function handleSave() {
    const cfg: ProviderConfig = {
      type: "openclaw",
      gatewayUrl: gatewayUrl.trim(),
      authToken: authToken.trim() || undefined,
    };
    providerService.setConfig(cfg);
    setConfig(cfg);
    setSaved(true);
    setHealthResult(null);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleHealthCheck() {
    const cfg: ProviderConfig = {
      type: "openclaw",
      gatewayUrl: gatewayUrl.trim(),
      authToken: authToken.trim() || undefined,
    };
    setChecking(true);
    setHealthResult(null);
    const provider = providerService.getProvider("openclaw");
    const result = await provider.healthCheck(cfg);
    setHealthResult(result);
    setChecking(false);
  }

  function handleClear() {
    providerService.setConfig(null);
    setConfig(null);
    setGatewayUrl("");
    setAuthToken("");
    setHealthResult(null);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  }

  const isOpenClawConfigured =
    config?.type === "openclaw" &&
    providerService.getProvider("openclaw").isConfigured(config);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Plug size={18} className="text-[var(--grace-accent)]" />
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure execution providers. GRACE routes Instance runs through the active provider.
        </p>
      </div>

      {/* Provider picker */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
          Providers
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["openclaw", "hermes", "claude", "codex"] as ProviderType[]).map((t) => (
            <ProviderCard
              key={t}
              type={t}
              active={selectedType === t}
              config={config}
              onSelect={() => setSelectedType(t)}
            />
          ))}
        </div>
      </div>

      {/* OpenClaw config form */}
      {selectedType === "openclaw" && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">OpenClaw Gateway</span>
              {isOpenClawConfigured && (
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 uppercase">
                  active
                </span>
              )}
            </div>
            {config && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-muted-foreground/60 hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <X size={11} /> {cleared ? "Cleared" : "Clear"}
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Gateway URL <span className="text-destructive">*</span>
              </label>
              <input
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="ws://localhost:3100 or wss://your-openclaw.example.com"
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
              />
              <p className="mt-1 text-[10px] text-muted-foreground/50">
                WebSocket URL for the OpenClaw gateway. Uses device-auth via preserved adapter plumbing (server-side).
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Auth Token
                <span className="ml-1 text-muted-foreground/40">(optional)</span>
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Bearer token or x-openclaw-token value"
                className="w-full rounded border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] bg-[var(--grace-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Save size={11} />
              {saved ? "Saved!" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleHealthCheck}
              disabled={checking || !gatewayUrl.trim()}
              className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-[var(--grace-accent)]/40 transition-all disabled:opacity-40"
            >
              {checking
                ? <Loader size={11} className="animate-spin" />
                : <RefreshCw size={11} />}
              Test Connection
            </button>
          </div>

          {healthResult && <HealthResult result={healthResult} />}

          <CapabilityMatrix providerType="openclaw" />
        </div>
      )}

      {/* Non-openclaw placeholder */}
      {selectedType !== "openclaw" && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-10 text-center">
          <Plug size={28} className="mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">
            {PROVIDER_LABELS[selectedType]} coming in a future phase
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50 max-w-xs mx-auto">
            {PROVIDER_DESCRIPTIONS[selectedType]}
          </p>
        </div>
      )}
    </div>
  );
}
