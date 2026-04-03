/**
 * OutputCard — Phase 8
 *
 * Reusable artifact/output card for use in:
 *   - Chat panel (inline unfurl)
 *   - Outputs tab in Studio console
 *   - Library page
 *
 * Supports: title, type, provider/source, link/path, metadata, open action.
 */

import { ExternalLink, FileText, Image, Link2, Box, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

export type OutputCardData = {
  id?: string;
  title: string;
  type: "file" | "link" | "image" | "artifact" | "json" | "text" | "unknown";
  source?: string;
  reference?: string;
  mimeType?: string;
  sizeBytes?: number;
  producedAt?: string;
  metadata?: Record<string, unknown>;
};

const TYPE_ICON: Record<OutputCardData["type"], React.ReactNode> = {
  file: <FileText size={13} />,
  link: <Link2 size={13} />,
  image: <Image size={13} />,
  artifact: <Box size={13} />,
  json: <FileJson size={13} />,
  text: <FileText size={13} />,
  unknown: <FileText size={13} />,
};

const TYPE_COLOR: Record<OutputCardData["type"], string> = {
  file: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  link: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  image: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  artifact: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  json: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  text: "border-muted bg-muted/40 text-muted-foreground",
  unknown: "border-muted bg-muted/40 text-muted-foreground",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface OutputCardProps {
  output: OutputCardData;
  compact?: boolean;
  className?: string;
}

export function OutputCard({ output, compact = false, className }: OutputCardProps) {
  const colorClass = TYPE_COLOR[output.type] ?? TYPE_COLOR.unknown;
  const isOpenable = !!output.reference;

  const handleOpen = () => {
    if (!output.reference) return;
    window.open(output.reference, "_blank", "noopener,noreferrer");
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs",
          className
        )}
      >
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", colorClass)}>
          {TYPE_ICON[output.type]}
        </span>
        <span className="truncate font-medium">{output.title}</span>
        <span className={cn("shrink-0 rounded border px-1 py-px text-[9px] uppercase tracking-wide", colorClass)}>
          {output.type}
        </span>
        {output.source && (
          <span className="ml-1 text-[9px] text-muted-foreground/40 truncate">{output.source}</span>
        )}
        {isOpenable && (
          <button
            type="button"
            onClick={handleOpen}
            className="ml-auto flex items-center gap-0.5 text-[10px] text-[var(--grace-accent)] hover:underline shrink-0"
          >
            Open <ExternalLink size={9} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 transition-colors hover:border-[var(--grace-accent)]/40",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", colorClass)}>
          {TYPE_ICON[output.type]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{output.title}</span>
            <span className={cn("shrink-0 rounded border px-1.5 py-px text-[9px] uppercase tracking-wide", colorClass)}>
              {output.type}
            </span>
          </div>
          {output.source && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
              via {output.source}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/50">
            {output.sizeBytes !== undefined && <span>{formatBytes(output.sizeBytes)}</span>}
            {output.mimeType && <span>{output.mimeType}</span>}
            {output.producedAt && (
              <span>{new Date(output.producedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        {isOpenable && (
          <button
            type="button"
            onClick={handleOpen}
            className="flex items-center gap-1 rounded border border-[var(--grace-accent)] px-2 py-1 text-[10px] font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)] shrink-0"
          >
            Open <ExternalLink size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
