/**
 * PreflightModal — runtime readiness checklist shown before Start Run.
 *
 * Evaluates these checks:
 *   1. Provider configured
 *   2. Provider reachable (from cached readiness or fresh probe)
 *   3. Pairing approved
 *   4. Primary agent bound to instance
 *   5. Instance has steps
 *
 * Blocking items disable the normal Start Run button.
 * Force Run is always available (clearly labeled as debug).
 */

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, AlertTriangle, XCircle, PlayCircle, Zap,
  Loader2, RefreshCw, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ProviderReadiness } from "../providers/providerTypes";
import type { Instance } from "../instances/instanceTypes";
import { providerService } from "../providers/providerService";

// ─── Check item type ──────────────────────────────────────────────────────────

type CheckSeverity = "ok" | "warn" | "blocking";

interface PreflightCheck {
  id: string;
  label: string;
  severity: CheckSeverity;
  detail?: string;
  /** Actionable next step shown when not OK */
  action?: string;
}

// ─── Build checks ─────────────────────────────────────────────────────────────

export function buildPreflightChecks(
  instance: Instance | null,
  readiness: ProviderReadiness | null,
): PreflightCheck[] {
  const config = providerService.getConfig();
  const checks: PreflightCheck[] = [];

  // 1 — Provider configured
  const isConfigured = config ? providerService.isConnected() : false;
  checks.push({
    id: "provider_configured",
    label: "Provider configured",
    severity: isConfigured ? "ok" : "blocking",
    detail: isConfigured
      ? `${config?.type ?? "provider"} — ${config?.gatewayUrl ?? ""}`
      : "No execution provider is set up.",
    action: isConfigured ? undefined : "Go to Connections and configure an OpenClaw gateway.",
  });

  // 2 — Provider reachable
  if (isConfigured) {
    const reachable = readiness?.reachable ?? null;
    checks.push({
      id: "provider_reachable",
      label: "Provider reachable",
      severity: reachable === null ? "warn" : reachable ? "ok" : "blocking",
      detail: reachable === null
        ? "Connectivity not yet tested. Run Test Connection in Connections first."
        : reachable
        ? readiness!.details
        : (readiness?.details ?? "Gateway is not reachable."),
      action: reachable === null
        ? "Open Connections and run a test."
        : reachable ? undefined : "Check gateway URL and that your OpenClaw server is running.",
    });

    // 3 — Pairing approved (only meaningful if reachable)
    if (reachable !== false) {
      const paired = readiness?.paired ?? null;
      checks.push({
        id: "pairing_approved",
        label: "Pairing approved",
        severity: paired === null ? "warn" : paired ? "ok" : "warn",
        detail: paired === null
          ? "Pairing status unknown — run a connection test."
          : paired
          ? "Gateway accepted the connect handshake."
          : "Gateway challenge was received but the connect request was rejected.",
        action: paired === false
          ? "Approve this device in the OpenClaw dashboard, then re-test."
          : undefined,
      });
    }
  }

  // 4 — Primary agent bound
  const primaryBinding = instance?.agentAssignments?.find((a) => a.role === "primary");
  checks.push({
    id: "agent_bound",
    label: "Primary agent bound",
    severity: primaryBinding ? "ok" : "warn",
    detail: primaryBinding
      ? `Bound to "${primaryBinding.agentName}" (${primaryBinding.agentId})`
      : "No primary agent is bound to this instance.",
    action: primaryBinding
      ? undefined
      : "Edit the instance to bind a primary agent, or the gateway will use its default assignment.",
  });

  // 5 — Instance has steps
  const stepCount = instance?.graphSnapshot?.length ?? 0;
  checks.push({
    id: "instance_steps",
    label: "Instance has workflow steps",
    severity: stepCount > 0 ? "ok" : "blocking",
    detail: stepCount > 0
      ? `${stepCount} step${stepCount === 1 ? "" : "s"} in workflow snapshot`
      : "The instance has no workflow steps.",
    action: stepCount === 0 ? "Re-create the instance from a blueprint that has steps." : undefined,
  });

  return checks;
}

/** True iff any check is "blocking" — prevents normal Start Run */
export function hasBlockingChecks(checks: PreflightCheck[]): boolean {
  return checks.some((c) => c.severity === "blocking");
}

// ─── Component ────────────────────────────────────────────────────────────────

const SEVERITY_ICON: Record<CheckSeverity, React.ReactNode> = {
  ok:       <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-px" />,
  warn:     <AlertTriangle size={14} className="text-amber-500  shrink-0 mt-px" />,
  blocking: <XCircle      size={14} className="text-destructive shrink-0 mt-px" />,
};

const SEVERITY_LABEL: Record<CheckSeverity, string> = {
  ok:       "text-emerald-600",
  warn:     "text-amber-600",
  blocking: "text-destructive",
};

function CheckRow({ check }: { check: PreflightCheck }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
      {SEVERITY_ICON[check.severity]}
      <div className="min-w-0">
        <p className={cn("text-xs font-medium leading-snug", SEVERITY_LABEL[check.severity])}>
          {check.label}
        </p>
        {check.detail && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/70 leading-snug">
            {check.detail}
          </p>
        )}
        {check.action && check.severity !== "ok" && (
          <p className="mt-1 text-[11px] text-muted-foreground/50 flex items-center gap-1 leading-snug">
            <Link2 size={9} className="shrink-0" />
            {check.action}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ReadinessLabel helper (used in Studio header) ────────────────────────────

export function ReadinessLabel({ readiness }: { readiness: ProviderReadiness | null }) {
  if (!readiness) {
    return (
      <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
        <AlertTriangle size={9} /> not tested
      </span>
    );
  }
  if (readiness.executionReady) {
    return (
      <span className="text-[10px] text-emerald-500/80 flex items-center gap-1">
        <CheckCircle2 size={9} /> ready
      </span>
    );
  }
  if (readiness.paired === false && readiness.reachable) {
    return (
      <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
        <AlertTriangle size={9} /> needs pairing
      </span>
    );
  }
  if (!readiness.reachable) {
    return (
      <span className="text-[10px] text-destructive/70 flex items-center gap-1">
        <XCircle size={9} /> unreachable
      </span>
    );
  }
  return (
    <span className="text-[10px] text-amber-500/80 flex items-center gap-1">
      <AlertTriangle size={9} /> needs setup
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface PreflightModalProps {
  open: boolean;
  onClose: () => void;
  instance: Instance | null;
  readiness: ProviderReadiness | null;
  /** Runs after user confirms — called with force=false for normal, force=true for debug override */
  onConfirmRun: (force: boolean) => void;
  runStarting: boolean;
}

export function PreflightModal({
  open, onClose, instance, readiness, onConfirmRun, runStarting,
}: PreflightModalProps) {
  const [showForce, setShowForce] = useState(false);
  const checks = buildPreflightChecks(instance, readiness);
  const blocked = hasBlockingChecks(checks);

  const okChecks      = checks.filter((c) => c.severity === "ok");
  const problemChecks = checks.filter((c) => c.severity !== "ok");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={15} className="text-[var(--grace-accent)]" />
            Readiness Check
          </DialogTitle>
          <DialogDescription>
            Verifying prerequisites before dispatching the run.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Problems first */}
          {problemChecks.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                Needs attention
              </p>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3">
                {problemChecks.map((c) => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* OK items */}
          {okChecks.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-1">
                Ready
              </p>
              <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3">
                {okChecks.map((c) => <CheckRow key={c.id} check={c} />)}
              </div>
            </div>
          )}

          {/* Summary message */}
          {blocked && (
            <p className="text-xs text-muted-foreground/70 leading-relaxed border-t border-border/40 pt-3">
              Blocking issues must be resolved before a normal run. Resolve them in{" "}
              <span className="font-medium text-foreground/80">Connections</span> or re-create the instance.
            </p>
          )}
          {!blocked && (
            <p className="text-xs text-emerald-600/80 leading-relaxed border-t border-border/40 pt-3">
              All required conditions are met. You can start the run.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Force run toggle for advanced users */}
            {blocked && !showForce && (
              <button
                type="button"
                onClick={() => setShowForce(true)}
                className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title="Bypass readiness checks — for advanced debugging only"
              >
                Force run ↓
              </button>
            )}

            {blocked && showForce && (
              <button
                type="button"
                disabled={runStarting}
                onClick={() => onConfirmRun(true)}
                className="flex items-center gap-1.5 rounded border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
                title="Dispatch anyway — run may fail if prerequisites are missing"
              >
                {runStarting ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Force dispatch
              </button>
            )}

            <button
              type="button"
              disabled={runStarting || blocked}
              onClick={() => onConfirmRun(false)}
              className={cn(
                "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-all",
                !blocked
                  ? "border-[var(--grace-accent)] bg-[var(--grace-accent)] text-white hover:opacity-90"
                  : "border-border text-muted-foreground/30 cursor-not-allowed",
              )}
            >
              {runStarting ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
              {runStarting ? "Starting…" : "Start Run"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
