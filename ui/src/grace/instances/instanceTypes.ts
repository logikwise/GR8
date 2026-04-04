export type InstanceStatus =
  | "draft"
  | "ready"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export interface AnsweredQuestion {
  questionId: string;
  label: string;
  value: string | number | boolean;
}

export interface AgentAssignment {
  role: "primary" | "specialist";
  label: string;
  agentId: string;
  agentName: string;
}

export interface InstanceStepSnapshot {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  prompt?: string;
  agentRole?: string;
  skills?: Array<{ id: string; name: string }>;
  tools?: Array<{ id: string; name: string }>;
}

export interface Instance {
  id: string;
  name: string;
  blueprintId: string;
  blueprintName: string;
  blueprintVersionSource: string;
  status: InstanceStatus;
  graphSnapshot: InstanceStepSnapshot[];
  configSnapshot: AnsweredQuestion[];
  agentAssignments: AgentAssignment[];
  instanceMemory: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
