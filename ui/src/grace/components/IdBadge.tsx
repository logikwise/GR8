/**
 * IdBadge — displays a unique ID with click-to-copy behaviour.
 * Intentionally subtle; intended for reference use on cards and rows.
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdBadgeProps {
  id: string;
  className?: string;
}

export function IdBadge({ id, className }: IdBadgeProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(id).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : `ID: ${id} — click to copy`}
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border/40 bg-muted/20 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/40 transition-colors hover:border-border hover:text-muted-foreground cursor-pointer select-none",
        copied && "border-emerald-500/40 text-emerald-500/70",
        className
      )}
    >
      {copied ? <Check size={8} /> : <Copy size={8} />}
      {id}
    </button>
  );
}
