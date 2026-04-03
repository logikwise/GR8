/**
 * InputsPanel — Phase 8
 *
 * User-provided asset surface for an instance/run.
 * Supports: drag/drop upload, file picker, link/URL entry.
 * Backed by inputService (localStorage in Phase 8).
 *
 * TODO (Phase 9): Replace inputService localStorage with backend file storage.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Link2, X, FileText, Image, FileJson, Paperclip } from "lucide-react";
import { inputService } from "../inputs/inputService";
import type { GraceInputAsset } from "../inputs/inputTypes";
import { cn } from "@/lib/utils";

interface InputsPanelProps {
  instanceId: string;
  runId?: string;
  className?: string;
}

function assetIcon(asset: GraceInputAsset) {
  if (asset.mimeType?.startsWith("image/")) return <Image size={11} className="text-emerald-400" />;
  if (asset.type === "link") return <Link2 size={11} className="text-violet-400" />;
  if (asset.mimeType === "application/json" || asset.name.endsWith(".json"))
    return <FileJson size={11} className="text-orange-400" />;
  return <FileText size={11} className="text-sky-400" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InputsPanel({ instanceId, runId, className }: InputsPanelProps) {
  const [assets, setAssets] = useState<GraceInputAsset[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(() => {
    setAssets(inputService.getForInstance(instanceId));
  }, [instanceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      const objectUrl = URL.createObjectURL(file);
      inputService.addFile(instanceId, file, objectUrl, runId);
    }
    reload();
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleAddLink() {
    const url = linkInput.trim();
    if (!url) return;
    try { new URL(url); } catch { return; }
    inputService.addLink(instanceId, url, runId);
    setLinkInput("");
    reload();
  }

  function handleDelete(id: string) {
    inputService.delete(id);
    reload();
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragOver
            ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)]"
            : "border-border hover:border-[var(--grace-accent)]/50 hover:bg-[var(--grace-accent-muted)]/40"
        )}
      >
        <Upload size={18} className="text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground/60">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-[10px] text-muted-foreground/30">
          Files are stored locally in this session
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Link entry */}
      <div className="flex items-center gap-1.5">
        <Link2 size={12} className="shrink-0 text-muted-foreground/40" />
        <input
          type="url"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
          placeholder="Paste a URL and press Enter…"
          className="flex-1 rounded border border-border bg-background px-2.5 py-1 text-xs placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
        />
        <button
          type="button"
          onClick={handleAddLink}
          disabled={!linkInput.trim()}
          className="rounded border border-[var(--grace-accent)] px-2.5 py-1 text-[10px] font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Asset list */}
      {assets.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground/30">
          No inputs attached to this instance yet.
        </p>
      ) : (
        <div className="space-y-1">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-2 rounded border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs"
            >
              {assetIcon(asset)}
              <span className="flex-1 truncate font-medium">{asset.name}</span>
              <span className="shrink-0 rounded bg-muted/60 px-1 py-px text-[9px] text-muted-foreground capitalize">
                {asset.sourceType}
              </span>
              {asset.sizeBytes !== undefined && (
                <span className="shrink-0 text-[9px] text-muted-foreground/40">
                  {formatBytes(asset.sizeBytes)}
                </span>
              )}
              {asset.type === "link" && (
                <a
                  href={asset.reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[10px] text-[var(--grace-accent)] hover:underline"
                >
                  Open
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDelete(asset.id)}
                className="shrink-0 text-muted-foreground/30 hover:text-destructive transition-colors"
                title="Remove input"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/25 flex items-center gap-1">
        <Paperclip size={8} />
        {assets.length} input{assets.length !== 1 ? "s" : ""} attached · agent can reference by ID ·{" "}
        <span className="text-amber-500/50">backend upload deferred (Phase 9)</span>
      </p>
    </div>
  );
}
