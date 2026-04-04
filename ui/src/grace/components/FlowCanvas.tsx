/**
 * FlowCanvas — Phase 9+ (circle node redesign)
 *
 * All node types are circles:
 *   ┌──────────────────┐
 *   │  TYPE  or  Step N │  ← small label ABOVE circle
 *   │  ┌────────────┐   │
 *   │  │ icon/init  │   │  ← circle with icon or initials
 *   │  └────────────┘   │
 *   │    node name       │  ← name BELOW circle
 *   └──────────────────┘
 *
 * Node types:
 *   stepNode   — violet/status color  — "Step N" above, agentRole as sub-label
 *   agentNode  — blue                 — "AGENT" above
 *   skillNode  — violet               — "SKILL" above
 *   toolNode   — amber                — "TOOL" above
 *
 * Step status → circle color:
 *   idle:      #475569  ready: #0ea5e9  running: #22c55e (pulse)
 *   waiting:   #f59e0b  completed: #3b82f6  failed: #ef4444
 *
 * Features:
 *   - Pan / drag / zoom (ReactFlow)
 *   - fitView on load
 *   - MiniMap, Controls, Background (dots)
 *   - "Reset to row" button (top-right)
 *   - Status pulse ring on running steps
 */

import { useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
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
import { AlignHorizontalDistributeCenter } from "lucide-react";
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

interface StepNodeData {
  step: FlowStep;
  status: StepStatus;
  index: number;
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Up to 2-letter initials from a name string */
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Truncate a string to max chars with ellipsis */
function trunc(s: string, max = 14): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const STEP_SIZE        = 68;   // step circle diameter
const STEP_SPACING     = 140;  // horizontal distance between step node origins
const AGENT_SIZE       = 60;   // agent circle diameter
const AGENT_GAP        = 20;
const AGENT_OFFSET_X   = 0;
const AGENT_OFFSET_Y   = -(AGENT_SIZE + 80); // well above step row
const SKILL_SIZE       = 44;
const SKILL_OFFSET_Y   = 140;  // below step row
const SKILL_SPACING    = 60;

// ─── Shared circle wrapper ────────────────────────────────────────────────────

/**
 * A column-flex wrapper: [label above] [circle] [name below]
 * Children go inside the circle div.
 */
function CircleNode({
  size,
  color,
  borderStyle = "solid",
  bgAlpha = 0.12,
  pulse = false,
  aboveLines,
  name,
  children,
  onClick,
}: {
  size: number;
  color: string;
  borderStyle?: "solid" | "dashed";
  bgAlpha?: number;
  pulse?: boolean;
  aboveLines: React.ReactNode;
  name: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* Label(s) above */}
      <div style={{
        marginBottom: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        minHeight: 22,
      }}>
        {aboveLines}
      </div>

      {/* Circle */}
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        borderStyle,
        background: `rgba(${hexToRgb(color)},${bgAlpha})`,
        boxShadow: pulse
          ? `0 0 0 4px ${color}30, 0 0 16px ${color}30`
          : `0 0 0 3px ${color}14, 0 2px 8px rgba(0,0,0,0.22)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        transition: "box-shadow 0.2s, border-color 0.2s",
      }}>
        {pulse && (
          <span style={{
            position: "absolute",
            inset: -5,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: 0.45,
            animation: "flowPulse 1.4s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}
        {children}
      </div>

      {/* Name below */}
      <div style={{
        marginTop: 6,
        fontSize: 9,
        fontWeight: 600,
        color: "var(--foreground)",
        opacity: 0.75,
        textAlign: "center",
        maxWidth: size + 28,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        lineHeight: 1.3,
      }}>
        {trunc(name, 16)}
      </div>
    </div>
  );
}

/** Convert 6-char hex (#rrggbb) to "r,g,b" for rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (isNaN(r)) return "100,116,139"; // fallback slate
  return `${r},${g},${b}`;
}

// ─── Tiny label helpers ───────────────────────────────────────────────────────

function TypeLabel({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      fontSize: 8,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color,
      opacity: 0.8,
      whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function StepNumLabel({ n }: { n: number }) {
  return (
    <span style={{
      fontSize: 8,
      fontWeight: 600,
      color: "var(--foreground)",
      opacity: 0.35,
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
    }}>
      Step {n}
    </span>
  );
}

// ─── Custom Nodes ─────────────────────────────────────────────────────────────

function StepNode({ data }: { data: StepNodeData }) {
  const color = STEP_STATUS_COLOR[data.status] ?? STEP_STATUS_COLOR.idle;
  const pulse = data.status === "running";
  const init  = initials(data.step.name);
  // agentRole displayed as the type label (e.g. "PRIMARY", "SCHEDULE", "REPORT")
  const roleLabel = data.step.agentRole
    ? data.step.agentRole.toUpperCase()
    : null;

  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Left}
        style={{ background: color, width: 7, height: 7, border: "none", left: -3 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: color, width: 7, height: 7, border: "none", right: -3 }} />

      <CircleNode
        size={STEP_SIZE}
        color={color}
        pulse={pulse}
        onClick={() => data.onInspect(data.step)}
        name={data.step.name}
        aboveLines={
          <>
            <StepNumLabel n={data.index + 1} />
            {roleLabel && <TypeLabel text={roleLabel} color={color} />}
          </>
        }
      >
        <span style={{
          fontSize: roleLabel ? 18 : 22,
          fontWeight: 800,
          color,
          lineHeight: 1,
          opacity: 0.9,
        }}>
          {init}
        </span>
      </CircleNode>
    </div>
  );
}

function AgentNode({ data }: { data: AgentNodeData }) {
  const color = data.linked ? "#3b82f6" : "#64748b";

  return (
    <div style={{ position: "relative" }}>
      <Handle type="source" position={Position.Bottom}
        style={{ background: color, width: 7, height: 7, border: "none", bottom: -3 }} />

      <CircleNode
        size={AGENT_SIZE}
        color={color}
        borderStyle={data.linked ? "solid" : "dashed"}
        name={data.label}
        aboveLines={
          <TypeLabel text="AGENT" color={color} />
        }
      >
        <span style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          lineHeight: 1,
          opacity: 0.9,
        }}>
          {data.label.charAt(0).toUpperCase()}
        </span>
      </CircleNode>
    </div>
  );
}

function SkillNode({ data }: { data: SkillNodeData }) {
  const color = "#8b5cf6";
  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: 6, height: 6, border: "none", top: -3 }} />

      <CircleNode
        size={SKILL_SIZE}
        color={color}
        name={data.label}
        aboveLines={<TypeLabel text="SKILL" color={color} />}
      >
        <span style={{ fontSize: 16, lineHeight: 1, opacity: 0.85 }}>⚡</span>
      </CircleNode>
    </div>
  );
}

function ToolNode({ data }: { data: ToolNodeData }) {
  const color = "#f59e0b";
  return (
    <div style={{ position: "relative" }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, width: 6, height: 6, border: "none", top: -3 }} />

      <CircleNode
        size={SKILL_SIZE}
        color={color}
        name={data.label}
        aboveLines={<TypeLabel text="TOOL" color={color} />}
      >
        <span style={{ fontSize: 15, lineHeight: 1, opacity: 0.85 }}>⚙</span>
      </CircleNode>
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  stepNode:  StepNode  as unknown as NodeTypes[string],
  agentNode: AgentNode as unknown as NodeTypes[string],
  skillNode: SkillNode as unknown as NodeTypes[string],
  toolNode:  ToolNode  as unknown as NodeTypes[string],
};

// ─── Build nodes + edges ──────────────────────────────────────────────────────

function buildNodesEdges(
  steps: FlowStep[],
  agents: StudioAgent[],
  statuses: StepStatusMap,
  onStepInspect: (step: FlowStep) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // ── Step nodes ─────────────────────────────────────────────────────────────
  steps.forEach((step, i) => {
    const x      = i * STEP_SPACING;
    const y      = 0;
    const status: StepStatus = (statuses[step.id] as StepStatus) ?? "idle";

    nodes.push({
      id: step.id,
      type: "stepNode",
      position: { x, y },
      data: { step, status, index: i, onInspect: onStepInspect } satisfies StepNodeData,
    });

    if (i > 0) {
      const prevColor = STEP_STATUS_COLOR[(statuses[steps[i - 1].id] as StepStatus) ?? "idle"];
      edges.push({
        id: `step-edge-${i}`,
        source: steps[i - 1].id,
        target: step.id,
        style: { stroke: "#334155", strokeWidth: 1.5 },
        animated: status === "running",
      });
    }

    // ── Skill sub-nodes (satellite below this step) ────────────────────────
    const skills = step.skills ?? [];
    skills.forEach((skill, si) => {
      const skillId = `skill-${skill.id}-${step.id}`;
      const totalW  = skills.length * SKILL_SIZE + (skills.length - 1) * 12;
      const startX  = x + STEP_SIZE / 2 - totalW / 2 + si * (SKILL_SIZE + 12);
      nodes.push({
        id: skillId,
        type: "skillNode",
        position: { x: startX, y: SKILL_OFFSET_Y },
        data: { label: skill.name, parentStepId: step.id } satisfies SkillNodeData,
      });
      edges.push({
        id: `skill-edge-${skillId}`,
        source: step.id,
        target: skillId,
        style: { stroke: "rgba(139,92,246,0.3)", strokeWidth: 1, strokeDasharray: "3 3" },
      });
    });

    // ── Tool sub-nodes (satellite below skills) ────────────────────────────
    const tools = step.tools ?? [];
    tools.forEach((tool, ti) => {
      const toolId  = `tool-${tool.id}-${step.id}`;
      const totalW  = tools.length * SKILL_SIZE + (tools.length - 1) * 12;
      const skillsH = (step.skills?.length ?? 0) > 0 ? SKILL_SIZE + 60 : 0;
      const startX  = x + STEP_SIZE / 2 - totalW / 2 + ti * (SKILL_SIZE + 12);
      nodes.push({
        id: toolId,
        type: "toolNode",
        position: { x: startX, y: SKILL_OFFSET_Y + skillsH },
        data: { label: tool.name, parentStepId: step.id } satisfies ToolNodeData,
      });
      edges.push({
        id: `tool-edge-${toolId}`,
        source: step.id,
        target: toolId,
        style: { stroke: "rgba(245,158,11,0.3)", strokeWidth: 1, strokeDasharray: "3 3" },
      });
    });
  });

  // ── Agent nodes ────────────────────────────────────────────────────────────
  const firstStepId = steps[0]?.id;
  agents.forEach((agent, i) => {
    const agentId = `agent-${agent.id}`;
    const x       = AGENT_OFFSET_X + i * (AGENT_SIZE + AGENT_GAP);
    const y       = AGENT_OFFSET_Y;

    nodes.push({
      id: agentId,
      type: "agentNode",
      position: { x, y },
      data: { label: agent.label, role: agent.role, linked: agent.linked } satisfies AgentNodeData,
    });

    if (firstStepId) {
      edges.push({
        id: `agent-edge-${agentId}`,
        source: agentId,
        target: firstStepId,
        style: {
          stroke: agent.linked ? "#3b82f6" : "#475569",
          strokeWidth: 1,
          strokeDasharray: agent.linked ? undefined : "4 3",
        },
      });
    }
  });

  return { nodes, edges };
}

// ─── Reset layout helper ──────────────────────────────────────────────────────

function computeResetPositions(nodes: Node[]): Node[] {
  const stepNodes  = nodes.filter((n) => n.type === "stepNode");
  const agentNodes = nodes.filter((n) => n.type === "agentNode");
  const skillNodes = nodes.filter((n) => n.type === "skillNode");
  const toolNodes  = nodes.filter((n) => n.type === "toolNode");

  // Re-derive step index from current ordering
  const updatedSteps = stepNodes.map((n, i) => ({
    ...n,
    position: { x: i * STEP_SPACING, y: 0 },
  }));

  const updatedAgents = agentNodes.map((n, i) => ({
    ...n,
    position: { x: AGENT_OFFSET_X + i * (AGENT_SIZE + AGENT_GAP), y: AGENT_OFFSET_Y },
  }));

  // Keep skill/tool positions relative to their parent steps
  // (approximate — group by parentStepId order)
  const parentOrder: Record<string, number> = {};
  updatedSteps.forEach((n, i) => { parentOrder[n.id] = i; });

  const updatedSkills = skillNodes.map((n) => {
    const data = n.data as SkillNodeData;
    const si   = parentOrder[data.parentStepId] ?? 0;
    return { ...n, position: { x: si * STEP_SPACING, y: SKILL_OFFSET_Y } };
  });

  const updatedTools = toolNodes.map((n) => {
    const data = n.data as ToolNodeData;
    const si   = parentOrder[data.parentStepId] ?? 0;
    return { ...n, position: { x: si * STEP_SPACING, y: SKILL_OFFSET_Y + SKILL_SIZE + 60 } };
  });

  return [...updatedSteps, ...updatedAgents, ...updatedSkills, ...updatedTools];
}

// ─── Inner canvas ─────────────────────────────────────────────────────────────

function FlowCanvasInner({ steps, agents, stepStatuses = {}, onStepInspect }: FlowCanvasProps) {
  const { fitView } = useReactFlow();

  const noop    = useCallback((_: FlowStep) => {}, []);
  const inspect = onStepInspect ?? noop;

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildNodesEdges(steps, agents, stepStatuses, inspect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  // Rebuild when step/agent identity changes (new workflow loaded)
  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesEdges(steps, agents, stepStatuses, inspect);
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")]);

  // Update step status without resetting positions
  useEffect(() => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.type !== "stepNode") return node;
        const status: StepStatus = (stepStatuses[node.id] as StepStatus) ?? "idle";
        if ((node.data as StepNodeData).status === status) return node;
        return { ...node, data: { ...node.data, status } };
      }),
    );
    setEdges((prev) =>
      prev.map((edge) => {
        if (!edge.target || edge.target.startsWith("agent-")) return edge;
        const targetStatus: StepStatus = (stepStatuses[edge.target] as StepStatus) ?? "idle";
        return { ...edge, animated: targetStatus === "running" };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stepStatuses)]);

  const handleResetLayout = useCallback(() => {
    setNodes((prev) => computeResetPositions(prev));
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 50);
  }, [setNodes, fitView]);

  return (
    <>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.06); }
        }
        .react-flow__node         { cursor: default; }
        .react-flow__node:hover   { z-index: 10; }
        .react-flow__controls     { bottom: 16px; left: 16px; }
        .react-flow__minimap      { bottom: 16px; right: 16px; border-radius: 8px; overflow: hidden; }
        .react-flow__background   { opacity: 0.4; }
        .grace-reset-btn {
          display: flex; align-items: center; justify-content: center;
          width: 26px; height: 26px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 5px;
          color: var(--muted-foreground);
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .grace-reset-btn:hover {
          color: var(--foreground);
          background: var(--accent);
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
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
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        />

        {/* Reset-to-row button — top-right */}
        <Panel position="top-right" style={{ top: 8, right: 8, margin: 0 }}>
          <button
            type="button"
            className="grace-reset-btn"
            title="Reset to horizontal row"
            onClick={handleResetLayout}
          >
            <AlignHorizontalDistributeCenter size={14} />
          </button>
        </Panel>
      </ReactFlow>
    </>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <FlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
