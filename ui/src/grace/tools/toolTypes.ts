/**
 * ToolDefinition — canonical schema for a GRACE tool.
 * grace.tools.v1 — stored in localStorage via toolService.
 */

export type ToolSource = "workspace" | "local" | "git" | "url" | "site" | "community" | "built-in";
export type ToolStatus = "draft" | "active" | "deprecated";
export type ToolVisibility = "private" | "workspace" | "shared";
export type ToolExecutionType = "api" | "local" | "provider" | "manual";

export interface ToolDefinition {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  author?: string;
  source?: ToolSource;
  providerCompatibility?: string[];
  executionType?: ToolExecutionType;
  configSchema?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  endpoint?: string;
  command?: string;
  visibility?: ToolVisibility;
  status?: ToolStatus;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    notes?: string;
    path?: string;
  };
}
