/**
 * SkillDefinition — canonical schema for a GRACE skill.
 * Grace.skills.v1 — stored in localStorage via skillService.
 */

export type SkillSource = "workspace" | "local" | "git" | "url" | "site" | "community" | "built-in";
export type SkillStatus = "draft" | "active" | "deprecated";
export type SkillVisibility = "private" | "workspace" | "shared";

export interface SkillExample {
  title: string;
  input: string;
  output?: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  slug: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  author?: string;
  source?: SkillSource;
  providerCompatibility?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  instructions?: string;
  examples?: SkillExample[];
  dependencies?: string[];
  visibility?: SkillVisibility;
  status?: SkillStatus;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    notes?: string;
    path?: string;
  };
}
