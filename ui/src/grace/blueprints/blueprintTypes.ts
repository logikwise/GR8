export type WorkflowType = "single-agent" | "multi-agent" | "swarm";

export type QuestionType = "text" | "number" | "boolean" | "select";

export interface BlueprintQuestion {
  id: string;
  label: string;
  type: QuestionType;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string | number | boolean;
  hint?: string;
}

export interface AgentRequirement {
  role: "primary" | "specialist";
  label: string;
  description?: string;
  required: boolean;
  capabilities?: string[];
}

export interface BlueprintSkill {
  id: string;
  name: string;
  description?: string;
}

export interface BlueprintTool {
  id: string;
  name: string;
  description?: string;
}

export interface BlueprintStep {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  agentRole?: string;
  skills?: BlueprintSkill[];
  tools?: BlueprintTool[];
  prompt?: string;
}

export interface BlueprintOutput {
  id: string;
  name: string;
  type: "text" | "json" | "file" | "report";
  description?: string;
}

export interface BlueprintUIMeta {
  icon?: string;
  color?: string;
  tags?: string[];
  category?: string;
}

export interface BlueprintInstanceConfig {
  questions: BlueprintQuestion[];
}

export interface BlueprintAgentConfig {
  primary?: AgentRequirement;
  specialists?: AgentRequirement[];
}

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  version: string;
  workflowType: WorkflowType;
  ui?: BlueprintUIMeta;
  instanceConfig: BlueprintInstanceConfig;
  agentConfig: BlueprintAgentConfig;
  steps: BlueprintStep[];
  outputs: BlueprintOutput[];
  createdAt?: string;
  updatedAt?: string;
}
