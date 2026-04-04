/**
 * FlowCanvas — circle nodes, inline agents, expandable skill/tool dots
 *
 * Layout:
 *   [AGENT]──[AGENT]──── Step 1 ──── Step 2 ──── Step 3
 *   All in one horizontal row.
 *
 * Step nodes:
 *   - Circle with 2-letter initials
 *   - "Step N" + agentRole above
 *   - Name below
 *   - Skill dots (violet) above circle, clickable to expand
 *   - Tool dots (amber) below circle, clickable to expand
 *
 * Agent nodes:
 *   - Circle with monogram, inline with steps to the left
 *   - Connected with same-style horizontal edges
 *
 * Canvas controls:
 *   - Reset layout button (top-right)
 *   - Minimap toggle (bottom-right) — starts hidden
 */

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { AlignHorizontalDistributeCenter, Map } from "lucide-react";
import type { FlowStep } from "./FlowStepCard";
import type { StudioAgent } from "./GraphCanvas";
import type { StepStatus } from "../providers/providerTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepStatusMap { [stepId: string]: StepStatus }

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

interface AgentNodeData { label: string; role: string; linked: boolean }

// ─── Colors ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<StepStatus, string> = {
  idle:         "#475569",
  ready:        "#0ea5e9",
  running:      "#22c55e",
  waiting:      "#f59e0b",
  human_review: "#a855f7",
  completed:    "#3b82f6",
  failed:       "#ef4444",
};

const SKILL_COLOR = "#8b5cf6";
const TOOL_COLOR  = "#f59e0b";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return isNaN(r) ? "100,116,139" : `${r},${g},${b}`;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

function trunc(s: string, max = 13): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const STEP_SIZE          = 68;
const STEP_SPACING       = 160;   // wider to accommodate skill/tool rows
const AGENT_SIZE         = 60;
const AGENT_GAP          = 20;    // gap between consecutive agents
const AGENT_STEP_GAP     = 60;    // gap between last agent and first step

// ─── Skill / Tool expandable dots ────────────────────────────────────────────

const DOT_SIZE      = 10;  // collapsed dot diameter
const DOT_EXP_SIZE  = 36;  // expanded circle diameter

interface DotItem { id: string; name: string }

function SkillToolDots({
  items, color, icon, expanded, onToggle,
}: {
  items: DotItem[];
  color: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: expanded ? 6 : 4,
        flexWrap: "wrap",
        maxWidth: STEP_SIZE + 40,
        cursor: "pointer",
      }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={expanded ? "Collapse" : items.map((i) => i.name).join(", ")}
    >
      {items.map((item) => (
        <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {/* Circle */}
          <div style={{
            width:        expanded ? DOT_EXP_SIZE : DOT_SIZE,
            height:       expanded ? DOT_EXP_SIZE : DOT_SIZE,
            borderRadius: "50%",
            background:   expanded
              ? `rgba(${hexToRgb(color)},0.14)`
              : color,
            border:       expanded ? `1.5px solid ${color}` : "none",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            transition:   "all 0.18s ease",
            flexShrink:   0,
          }}>
            {expanded && (
              <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
            )}
          </div>
          {/* Name label (only when expanded) */}
          {expanded && (
            <span style={{
              fontSize: 8,
              color,
              fontWeight: 600,
              textAlign: "center",
              maxWidth: DOT_EXP_SIZE + 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {trunc(item.name, 10)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step Node ────────────────────────────────────────────────────────────────

function StepNode({ data }: { data: StepNodeData }) {
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [toolsExpanded,  setToolsExpanded]  = useState(false);

  const color  = STATUS_COLOR[data.status] ?? STATUS_COLOR.idle;
  const pulse  = data.status === "running";
  const skills = data.step.skills ?? [];
  const tools  = data.step.tools  ?? [];
  const init   = initials(data.step.name);
  const role   = data.step.agentRole?.toUpperCase() ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Labels above */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginBottom: 4, minHeight: 20 }}>
        <span style={{ fontSize: 8, color: "var(--foreground)", opacity: 0.35, fontWeight: 600, letterSpacing: "0.06em" }}>
          Step {data.index + 1}
        </span>
        {role && (
          <span style={{ fontSize: 8, color, opacity: 0.8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {role}
          </span>
        )}
      </div>

      {/* Skill dots — above circle */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 5 }}>
          <SkillToolDots
            items={skills}
            color={SKILL_COLOR}
            icon="⚡"
            expanded={skillsExpanded}
            onToggle={() => setSkillsExpanded((v) => !v)}
          />
        </div>
      )}

      {/* Main circle */}
      <div style={{ position: "relative" }}>
        <Handle type="target" position={Position.Left}
          style={{ background: color, width: 7, height: 7, border: "none", left: -3 }} />
        <Handle type="source" position={Position.Right}
          style={{ background: color, width: 7, height: 7, border: "none", right: -3 }} />

        <div
          onClick={() => data.onInspect(data.step)}
          style={{
            width:        STEP_SIZE,
            height:       STEP_SIZE,
            borderRadius: "50%",
            border:       `2px solid ${color}`,
            background:   `rgba(${hexToRgb(color)},0.11)`,
            boxShadow:    pulse
              ? `0 0 0 4px ${color}30, 0 0 18px ${color}28`
              : `0 0 0 3px ${color}14, 0 2px 8px rgba(0,0,0,0.2)`,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
            cursor:       "pointer",
            position:     "relative",
            transition:   "box-shadow 0.2s",
            flexShrink:   0,
          }}
        >
          {pulse && (
            <span style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: `2px solid ${color}`, opacity: 0.45,
              animation: "flowPulse 1.4s ease-in-out infinite",
              pointerEvents: "none",
            }} />
          )}
          <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1, opacity: 0.9 }}>
            {init}
          </span>
        </div>
      </div>

      {/* Tool dots — below circle */}
      {tools.length > 0 && (
        <div style={{ marginTop: 5 }}>
          <SkillToolDots
            items={tools}
            color={TOOL_COLOR}
            icon="⚙"
            expanded={toolsExpanded}
            onToggle={() => setToolsExpanded((v) => !v)}
          />
        </div>
      )}

      {/* Name below */}
      <div style={{
        marginTop: 6,
        fontSize: 9, fontWeight: 600,
        color: "var(--foreground)", opacity: 0.75,
        textAlign: "center",
        maxWidth: STEP_SIZE + 28,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {trunc(data.step.name, 16)}
      </div>
    </div>
  );
}

// ─── Agent Node ───────────────────────────────────────────────────────────────

function AgentNode({ data }: { data: AgentNodeData }) {
  const color = data.linked ? "#3b82f6" : "#64748b";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* "AGENT" label above */}
      <div style={{ marginBottom: 4, minHeight: 20, display: "flex", alignItems: "flex-end" }}>
        <span style={{ fontSize: 8, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8 }}>
          AGENT
        </span>
      </div>

      {/* Circle */}
      <div style={{ position: "relative" }}>
        <Handle type="source" position={Position.Right}
          style={{ background: color, width: 7, height: 7, border: "none", right: -3 }} />

        <div style={{
          width:        AGENT_SIZE,
          height:       AGENT_SIZE,
          borderRadius: "50%",
          border:       `2px solid ${color}`,
          borderStyle:  data.linked ? "solid" : "dashed",
          background:   `rgba(${hexToRgb(color)},0.11)`,
          boxShadow:    data.linked
            ? `0 0 0 3px ${color}18, 0 2px 10px ${color}28`
            : "0 1px 6px rgba(0,0,0,0.18)",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          cursor:       "default",
          flexShrink:   0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, opacity: 0.9 }}>
            {data.label.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Name below */}
      <div style={{
        marginTop: 6,
        fontSize: 9, fontWeight: 600,
        color: "var(--foreground)", opacity: 0.75,
        textAlign: "center",
        maxWidth: AGENT_SIZE + 28,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {trunc(data.label, 14)}
      </div>
    </div>
  );
}

const NODE_TYPES: NodeTypes = {
  stepNode:  StepNode  as unknown as NodeTypes[string],
  agentNode: AgentNode as unknown as NodeTypes[string],
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

  // ── Agent nodes — same row, LEFT of first step ─────────────────────────────
  // Last agent is closest to step 0, at x = -AGENT_STEP_GAP - AGENT_SIZE
  const firstStepId = steps[0]?.id;
  agents.forEach((agent, i) => {
    const agentId = `agent-${agent.id}`;
    const x = -(agents.length - i) * (AGENT_SIZE + AGENT_GAP) - AGENT_STEP_GAP;
    nodes.push({
      id: agentId,
      type: "agentNode",
      position: { x, y: 0 },
      data: { label: agent.label, role: agent.role, linked: agent.linked } satisfies AgentNodeData,
    });

    // Edge to first step (or to next agent if chained)
    const target = i === agents.length - 1 ? firstStepId : `agent-${agents[i + 1]?.id}`;
    if (target) {
      edges.push({
        id: `agent-edge-${agentId}`,
        source: agentId,
        target,
        style: {
          stroke: agent.linked ? "#3b82f6" : "#475569",
          strokeWidth: 1.5,
          strokeDasharray: agent.linked ? undefined : "4 3",
        },
      });
    }
  });

  // ── Step nodes — left to right ─────────────────────────────────────────────
  steps.forEach((step, i) => {
    const status: StepStatus = (statuses[step.id] as StepStatus) ?? "idle";
    nodes.push({
      id: step.id,
      type: "stepNode",
      position: { x: i * STEP_SPACING, y: 0 },
      data: { step, status, index: i, onInspect: onStepInspect } satisfies StepNodeData,
    });

    if (i > 0) {
      edges.push({
        id: `step-edge-${i}`,
        source: steps[i - 1].id,
        target: step.id,
        style: { stroke: "#334155", strokeWidth: 1.5 },
        animated: status === "running",
      });
    }
  });

  return { nodes, edges };
}

// ─── Reset layout ─────────────────────────────────────────────────────────────

function computeResetPositions(nodes: Node[]): Node[] {
  const stepNodes  = nodes.filter((n) => n.type === "stepNode");
  const agentNodes = nodes.filter((n) => n.type === "agentNode");

  const updatedSteps = stepNodes.map((n, i) => ({
    ...n, position: { x: i * STEP_SPACING, y: 0 },
  }));
  const updatedAgents = agentNodes.map((n, i) => ({
    ...n,
    position: {
      x: -(agentNodes.length - i) * (AGENT_SIZE + AGENT_GAP) - AGENT_STEP_GAP,
      y: 0,
    },
  }));
  return [...updatedAgents, ...updatedSteps];
}

// ─── Toolbar button style ─────────────────────────────────────────────────────

const BTN_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26,
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--muted-foreground)",
  cursor: "pointer",
};

// ─── Inner canvas ─────────────────────────────────────────────────────────────

function FlowCanvasInner({ steps, agents, stepStatuses = {}, onStepInspect }: FlowCanvasProps) {
  const { fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(false);

  const noop    = useCallback((_: FlowStep) => {}, []);
  const inspect = onStepInspect ?? noop;

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildNodesEdges(steps, agents, stepStatuses, inspect),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesEdges(steps, agents, stepStatuses, inspect);
    setNodes(n); setEdges(e);
    setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.map((s) => s.id).join(","), agents.map((a) => a.id).join(",")]);

  // Status color updates without position reset
  useEffect(() => {
    setNodes((prev) => prev.map((node) => {
      if (node.type !== "stepNode") return node;
      const status: StepStatus = (stepStatuses[node.id] as StepStatus) ?? "idle";
      if ((node.data as StepNodeData).status === status) return node;
      return { ...node, data: { ...node.data, status } };
    }));
    setEdges((prev) => prev.map((edge) => {
      if (!edge.target || edge.target.startsWith("agent-")) return edge;
      const s: StepStatus = (stepStatuses[edge.target] as StepStatus) ?? "idle";
      return { ...edge, animated: s === "running" };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stepStatuses)]);

  const handleReset = useCallback(() => {
    setNodes((prev) => computeResetPositions(prev));
    setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50);
  }, [setNodes, fitView]);

  return (
    <>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.06); }
        }
        .react-flow__node        { cursor: default; }
        .react-flow__node:hover  { z-index: 10; }
        .react-flow__controls    { bottom: 16px; left: 16px; }
        .react-flow__minimap     { bottom: 50px; right: 16px; border-radius: 8px; overflow: hidden; }
        .react-flow__background  { opacity: 0.4; }
        .grace-flow-btn:hover { color: var(--foreground) !important; background: var(--accent) !important; }
      `}</style>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15} maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls showInteractive={false} style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }} />

        {showMinimap && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "agentNode") return "#3b82f6";
              const d = node.data as StepNodeData;
              return STATUS_COLOR[d?.status ?? "idle"] ?? "#475569";
            }}
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          />
        )}

        {/* Top-right buttons: reset + minimap toggle */}
        <Panel position="top-right" style={{ top: 8, right: 8, margin: 0, display: "flex", gap: 6 }}>
          <button type="button" className="grace-flow-btn"
            style={{ ...BTN_STYLE, color: showMinimap ? "var(--foreground)" : undefined }}
            title={showMinimap ? "Hide minimap" : "Show minimap"}
            onClick={() => setShowMinimap((v) => !v)}
          >
            <Map size={13} />
          </button>
          <button type="button" className="grace-flow-btn"
            style={BTN_STYLE}
            title="Reset to horizontal row"
            onClick={handleReset}
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
