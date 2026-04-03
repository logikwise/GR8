/**
 * Library — Placeholder (Phase 4+)
 *
 * Future home for the GRACE knowledge and resource library:
 * documents, templates, knowledge bases, RAG sources, shared assets.
 *
 * TODO (Phase 4): Define scope — likely knowledge base / RAG source management.
 */

import { LibraryBig } from "lucide-react";

export function GraceLibrary() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared resources, knowledge bases, and documents available to agent workflows.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-card/50 p-14 text-center">
        <LibraryBig size={32} className="mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Library coming in Phase 4</p>
        <p className="mt-1 text-xs text-muted-foreground/60 max-w-sm mx-auto">
          This surface will host shared documents, RAG sources, templates, and reusable assets accessible across all workflows and agents.
        </p>
      </div>
    </div>
  );
}
