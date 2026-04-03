import { useState } from "react";
import { BookOpen, Plus, Upload, Search, X } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { blueprintService } from "../blueprints/blueprintService";
import { BlueprintCard } from "../components/BlueprintCard";
import type { Blueprint } from "../blueprints/blueprintTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileJson, Link, AlertCircle } from "lucide-react";
import type { DragEvent, ChangeEvent } from "react";
import { useRef } from "react";

type ImportTab = "file" | "paste" | "url";

function ImportBlueprintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<ImportTab>("file");
  const [dragging, setDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTab("file");
    setDragging(false);
    setDroppedFile(null);
    setPasteContent("");
    setUrlValue("");
    setError(null);
  }

  function handleClose() { reset(); onClose(); }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: DragEvent) {
    e.preventDefault(); setDragging(false); setError(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(json|yaml|yml)$/)) { setError("Only .json, .yaml, or .yml files are supported."); return; }
    setDroppedFile(file);
  }
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(json|yaml|yml)$/)) { setError("Only .json, .yaml, or .yml files are supported."); return; }
    setDroppedFile(file);
  }

  const canImport =
    (tab === "file" && !!droppedFile) ||
    (tab === "paste" && pasteContent.trim().length > 0) ||
    (tab === "url" && urlValue.trim().length > 0);

  const TABS: { id: ImportTab; label: string; icon: React.ReactNode }[] = [
    { id: "file", label: "File", icon: <FileJson size={14} /> },
    { id: "paste", label: "Paste JSON / YAML", icon: <Upload size={14} /> },
    { id: "url", label: "URL", icon: <Link size={14} /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Blueprint</DialogTitle>
          <DialogDescription>Import a blueprint from a file, pasted content, or a remote URL.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setError(null); }}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
        <div className="mt-1">
          {tab === "file" && (
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn("flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors select-none",
                dragging ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)]" :
                droppedFile ? "border-[var(--grace-accent)] bg-[var(--grace-accent-muted)]" :
                "border-border bg-muted/20 hover:border-[var(--grace-accent)]/50 hover:bg-muted/40")}>
              <input ref={fileInputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleFileChange} />
              {droppedFile ? (
                <><FileJson size={28} className="text-[var(--grace-accent)]" />
                  <div><p className="text-sm font-medium text-[var(--grace-accent)]">{droppedFile.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{(droppedFile.size / 1024).toFixed(1)} KB — click to change</p></div></>
              ) : (
                <><Upload size={28} className="text-muted-foreground/50" />
                  <div><p className="text-sm font-medium">Drop a file here or click to browse</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Supports .json, .yaml, .yml blueprint files</p></div></>
              )}
            </div>
          )}
          {tab === "paste" && (
            <Textarea value={pasteContent} onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`Paste blueprint JSON or YAML here...\n\n{\n  "name": "My Blueprint",\n  "steps": [...]\n}`}
              className="min-h-44 resize-y font-mono text-xs" />
          )}
          {tab === "url" && (
            <div className="space-y-2">
              <Input type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com/blueprint.json" />
              <p className="text-xs text-muted-foreground">The URL must return a valid JSON or YAML blueprint. CORS-permissive endpoints only.</p>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
          <Button size="sm" disabled={!canImport}
            style={{ background: canImport ? "var(--grace-accent)" : undefined, color: canImport ? "var(--grace-accent-foreground)" : undefined }}
            onClick={() => setError("Blueprint import is coming soon — this feature is not yet wired to the backend.")}>
            Import Blueprint
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GraceWorkflowLibrary() {
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allBlueprints = blueprintService.getAll();
  const filtered = allBlueprints.filter((bp) => {
    const q = search.toLowerCase();
    return !q || bp.name.toLowerCase().includes(q) || bp.description.toLowerCase().includes(q) || bp.ui?.tags?.some((t) => t.includes(q));
  });

  function handleOpen(bp: Blueprint) {
    navigate(`/grace/studio/blueprint/${bp.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workflow Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage Blueprints. Blueprints are templates — create an Instance to execute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--grace-accent)] hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]">
            <Upload size={14} />Import Blueprint
          </button>
          <button type="button"
            className="flex items-center gap-1.5 rounded border border-[var(--grace-accent)] px-3 py-1.5 text-xs font-medium text-[var(--grace-accent)] transition-colors hover:bg-[var(--grace-accent-muted)]">
            <Plus size={14} />New Blueprint
          </button>
        </div>
      </div>

      {allBlueprints.length > 0 && (
        <div className="mb-4 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blueprints…"
            className="w-full rounded-md border border-border bg-card pl-8 pr-8 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[var(--grace-accent)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 && allBlueprints.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No blueprints yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Create or import a Blueprint to get started.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button type="button" onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[var(--grace-accent)] hover:text-[var(--grace-accent)] hover:bg-[var(--grace-accent-muted)]">
              <Upload size={14} />Import Blueprint
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && allBlueprints.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-sm text-muted-foreground">No blueprints match "{search}"</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((bp) => (
            <BlueprintCard key={bp.id} blueprint={bp} onOpen={handleOpen} />
          ))}
        </div>
      )}

      <ImportBlueprintModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
