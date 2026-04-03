/**
 * ConfirmDialog — Phase 5
 *
 * Reusable confirmation modal for destructive actions (delete, cancel, etc.)
 */

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmCls =
    variant === "danger"
      ? "bg-destructive text-white hover:bg-destructive/90"
      : variant === "warning"
        ? "bg-amber-500 text-white hover:bg-amber-600"
        : "bg-[var(--grace-accent)] text-white hover:opacity-90";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6 mx-4">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              variant === "danger"
                ? "bg-destructive/15"
                : variant === "warning"
                  ? "bg-amber-500/15"
                  : "bg-[var(--grace-accent-muted)]",
            )}
          >
            <AlertTriangle
              size={16}
              className={cn(
                variant === "danger"
                  ? "text-destructive"
                  : variant === "warning"
                    ? "text-amber-500"
                    : "text-[var(--grace-accent)]",
              )}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40",
              confirmCls,
            )}
          >
            {loading ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
