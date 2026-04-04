/**
 * FlowCanvas — Phase 9
 *
 * Replaces the custom HTML5 canvas (GraphCanvas.tsx) with React Flow.
 *
 * Features:
 *   - Pan + drag canvas natively
 *   - Mouse wheel / trackpad zoom
 *   - fitView on load
 *   - MiniMap, Controls, Background (dots)
 *   - Custom node types: StepNode, AgentNode, SkillNode, ToolNode
 *   - Agent nodes connect to first step
 *   - Step status → node color + pulse animation
 *   - Click step node → onStepInspect()
 *
 * Color system (matches spec):
 *   agent:    #3b82f6 (blue)
 *   step:     #8b5cf6 (violet, default) / status overrides
 *   skill:    #8b5cf6 (violet)
 *   tool:     #f59e0b (amber)
 *   artifact: #22c55e (green)
 *
 * Step status → node color:
 *   idle:      #475569 (slate)
 *   ready:     #0ea5e9 (sky)
 *   running:   #22c55e (emerald) + pulse ring
 *   waiting:   #f59e0b (amber)
 *   completed: #3b82f6 (blue)
 *   failed:    #ef4444 (red)
 */

import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import type { FlowStep } from "./FlowStepCard";
import type { StudioAgent } from "./GraphCanvas";
import type { StepStatus } from "../providers/providerTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepStatusMap {
  [stepId: string]: StepStatus;
}

interface FlowCanvasProps {
  steps: FlowStep[];
  agents: StudioAgent[];
  stepStatuses?: StepStatusMap;
  onStepInspect?: (step: FlowStep) => void;
}

// Custom node data shapes
interface StepNodeData {
  step: FlowStep;
  status: StepStatus;
  onInspect: (step: FlowStep) => void;
}

interface AgentNodeData {
  label: string;
  role: string;
  linked: boolean;
}

interface SkillNodeData {
  label: string;
  parentStepId: string;
}

interface ToolNodeData {
  label: string;
  parentStepId: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const STEP_STATUS_COLOR: Record<StepStatus, string> = {
  idle:         "#475569",
  ready:        "#0ea5e9",
  running:      "#22c55e",
  waiting:      "#f59e0b",
  human_review: "#a855f7",
  completed:    "#3b82f6",
  failed:       "#ef4444",
};

const STEP_STATUS_BG: Record<StepStatus, string> = {
  idle:         "rgba(71,85,105,0.08)",
  ready:        "rgba(14,165,233,0.08)",
  running:      "rgba(34,197,94,0.12)",
  waiting:      "rgba(245,158,11,0.08)",
  human_review: "rgba(168,85,247,0.08)",
  completed:    "rgba(59,130,246,0.10)",
  failed:       "rgba(239,68,68,0.10)",
};

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function StepNode({ data }: { data: StepNodeData }) {
  const color  = STEP_STATUS_COLOR[data.status] ?? STEP_STATUS_COLOR.idle;
  const bg     = STEP_STATUS_BG[data.status]    ?? STEP_STATUS_BG.idle;
  const pulse  = data.status === "running";
  const skills = data.step.skills?.slice(0, 3) ?? [];
  const tools  = data.step.tools?.slice(0, 3)  ?? [];

  return (
    <div
      onClick={() => data.onInspect(data.step)}
      style={{
        border: `1.5px solid ${color}`,
        background: bg,
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 160,
        maxWidth: 220,
        cursor: "pointer",
        position: "relative",
        backdropFilter: "blur(4px)",
        boxShadow: pulse
          ? `0 0 0 3px ${color}33, 0 2px 12px ${color}22`
          : `0 1px 6px rgba(0,0,0,0.2)`,
        transition: "box-shadow 0.2s",
      }}
    >
      {pulse && (
        <span
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: 13,
            border: `2px solid ${color}`,
            opacity: 0.5,
            animation: "flowPulse 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      <Handle type="target" position={Position.Left}  style={{ background: color, width: 8, height: 8, border: "none" }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 8, height: 8, border: "none" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%", background: color,
          flexShrink: 0, boxShadow: pulse ? `0 0 6px ${color}` : "none",
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: "var(--foreground)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>
          {data.step.name}
        </span>
      </div>

      {data.step.agentRole && (
        <div style={{ fontSize: 9, color, opacity: 0.8, marginBottom: 3, marginLeft: 13 }}>
          {data.step.agentRole}
        </div>
      )}

      {(skills.length > 0 || tools.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginLeft: 13 }}>
          {skills.map((s) => (
            <span key={s.id} style={{
              fontSize: 8, padding: "1px 5px", borderRadius: 4,
              background: "rgba(139,92,246,0.12)", color: "#8b5cf6",
              border: "1px solid rgba(139,92,246,0.2)",
            }}>{s.name ?? s.id}</span>
          ))}
          {tools.map((t) => (
            <span key={t.id} style={{
              fontSize: 8, padding: "1px 5px", borderRadius: 4,
              background: "rgba(245,158,11,0.10)", color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.2)",
            }}>{t.name ?? t.id}</span>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 5, marginLeft: 13, fontSize: 9,
        color: color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        {data.status}
      </div>
    </div>
  );
}

function AgentNode({ data }: { data: AgentNodeData }) {
  const color = data.linked ? "#3b82f6" : "#64748b";

  return (
    <div style={{
      border: `1.5px solid ${color}`,
      borderStyle: data.linked ? "solid" : "dashed",
      background: `rgba(${data.linked ? "59,130,246" : "100,116,139"},0.08)`,
      borderRadius: 10,
      padding: "8px 14px",
      minWidth: 130,
      cursor: "default",
      boxShadow: "0 1px 6px rgba(0,0,0,0.18)",
    }}>
      <Handle type="source" position={Position.Right} style={{ background: color, width: 8, height: 8, border: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: `rgba(${data.linked ? "59,130,246" : "100,116,139"},0.15)`,
          border: `1px solid ${color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color }}>
            {data.label.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
            {data.label}
          </div>
          <div style={{ fontSize: 9, color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {data.role}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillNode({ data }: { data: SkillNodeData }) {
  return (
    <div style={{
      border: "1px solid rgba(139,92,246,0.3)",
      background: "rgba(139,92,246,0.06)",
      borderRadius: 6, padding: "4px 10px", fontSize: 9,
      color: "#8b5cf6", fontWeight: 500,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#8b5cf6", width: 6, height: 6, border: "none" }} />
      {data.label}
    </div>
  );
}

function ToolNode({ data }: { data: ToolNodeData }) {
  return (
    <div style={{
      border: "1px solid rgba(245,158,11,0.3)",
      background: "rgba(245,158,11,0.06)",
      borderRadius: 6, padding: "4px 10px", fontSize: 9,
      color: "#f59e0b", fontWeight: 500,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#f59e0b", width: 6, height: 6, border: "none" }} />
      {data.label}
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  stepNode:  StepNode  as unknown as NodeTypes[string],
  agentNode: AgentNode as unknown as NodeTypes[string],
  skillNode: SkillNode as unknown as NodeTypes[string],
  toolNode:  ToolNode  as unknown as NodeTypes[string],
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const STEP_W   = 220;
const STEP_H   = 90;
const STEP_GAP = 60;
const AGENT_W  = 150;
const AGENT_H  = 50;
const AGENT_OFFSET_X = 20;
const AGENT_OFFSET_Y = -80;

function buildNodesEdges(
  steps: FlowStep[],
  agents: StudioAgent[],
  statuses: StepStatusMap,
  onStepInspect: (step: FlowStep) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Step nodes — left to right
  steps.forEach((step, i) => {
    const x = i * (STEP_W + STEP_GAP);
    const y = 0;
    const status: StepStatus = (statuses[step.id] as StepStatus) ?? "idle";

    nodes.push({
      id: step.id,
      type: "stepNode",
      position: { x, y },
      data: { step, status, onInspect: onStepInspect } satisfies StepNodeData,
      style: { width: STEP_W },
    });

    if (i > 0) {
      edges.push({
        id: `step-edge-${i}`,
        source: steps[i - 1].id,
        target: step.id,
        style: { stroke: "#475569", strokeWidth: 1.5 },
        animated: status === "running",
      });
    }
  });

  // Agent nodes — above and to the left of first step
  const firstStepId = steps[0]?.id;
  agents.forEach((agent, i) => {
    const agentId = `agent-${agent.id}`;
    const x = AGENT_OFFSET_X + i * (AGENT_W + 20);
    const y = AGENT_OFFSET_Y - i * 10;

    nodes.push({
      id: agentId,
      type: "agentNode",
      position: { x, y },
      data: { label: agent.label, role: agent.role, linked: agent.linked } satisfies AgentNodeData,
      style: { width: AGENT_W },
    });

    if (firstStepId) {
      edges.push({
        id: `agent-edge-${agentId}`,
        source: agentId,
        target: firstStepId,
        style: { stroke: agent.linked ? "#3b82f6" : "#475569", strokeWidth: 1, strokeDasharray: agent.linked ? undefined : "4 3" },
      });
    }
  });

  return { nodes, edges };
}

// ─── Inner canvas (needs ReactFlowProvider wrapper) ───────────────────────────

function FlowCanvasInner({ steps, agents, stepStatuses = {}, onStepInspect }: FlowCanvasProps) {
  const { fitView } = useReactFlow();

  const noop = useCallback((_: FlowStep) => {}, []);
  const inspect = onStepInspect ?? noop;

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildNodesEdges(steps, agents, stepStatuses, inspect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  // Rebuild nodes when steps change identity (e.g. new workflow loaded)
  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesEdges(steps, agents, stepStatuses, inspect);
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")]);

  // Update step status colors without rebuilding positions
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.type !== "stepNode") return node;
        const status: StepStatus = (stepStatuses[node.id] as StepStatus) ?? "idle";
        if ((node.data as StepNodeData).status === status) return node;
        return { ...node, data: { ...node.data, status } };
      }),
    );
    // Update edge animation based on running steps
    setEdges((prev) =>
      prev.map((edge) => {
        if (!edge.target || edge.target.startsWith("agent-")) return edge;
        const targetStatus: StepStatus = (stepStatuses[edge.target] as StepStatus) ?? "idle";
        return { ...edge, animated: targetStatus === "running" };
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stepStatuses)]);

  return (
    <>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        .react-flow__node { cursor: default; }
        .react-flow__node:hover { z-index: 10; }
        .react-flow__controls { bottom: 16px; left: 16px; }
        .react-flow__minimap { bottom: 16px; right: 16px; border-radius: 8px; overflow: hidden; }
        .react-flow__background { opacity: 0.4; }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border)"
        />
        <Controls
          showInteractive={false}
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "agentNode") return "#3b82f6";
            if (node.type === "skillNode") return "#8b5cf6";
            if (node.type === "toolNode")  return "#f59e0b";
            const d = node.data as StepNodeData;
            return STEP_STATUS_COLOR[d?.status ?? "idle"] ?? "#475569";
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        />
      </ReactFlow>
    </>
  );
}

// ─── Public export (wrapped in provider) ──────────────────────────────────────

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
