/**
 * GRACE Input / Asset model — Phase 8
 *
 * Represents a user-provided asset attached to an instance or run.
 * Persisted via inputService (localStorage in Phase 8).
 *
 * TODO (Phase 9): Replace localStorage persistence with
 *   POST /api/grace/inputs and GET /api/grace/inputs?instanceId=...
 */

export type InputSourceType = "upload" | "link" | "pasted" | "generated";

export type GraceInputAsset = {
  id: string;
  instanceId: string;
  runId?: string;
  name: string;
  type: string;
  sourceType: InputSourceType;
  mimeType?: string;
  /** For uploads: local object URL (Phase 8). For links/pasted: the URL. */
  reference: string;
  sizeBytes?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
};
