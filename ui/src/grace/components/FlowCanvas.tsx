/**
 * FlowCanvas — circle nodes with physics spring, sub-agent hierarchy, expandable dots
 *
 * Layout:
 *   [PRIMARY_AGENT] ── Step 1 ── Step 2 ── Step 3
 *         │
 *       [SUB1] [SUB2]   ← specialists, smaller + indigo, below primary
 *
 * Features:
 *   - Primary agents inline left of steps; specialist (sub) agents below primaries
 *   - Skills/tools as expandable colored dots on step nodes
 *   - Clicking a dot expands it; `activeSkillId`/`activeToolId` props expand from outside
 *   - Clicking an agent node fires `onAgentInspect`
 *   - Soft spring gravity — nodes drift back to rest positions after dragging
 *   - Minimap toggle (hidden by default)
 *   - Reset layout button
 */

import { useState, useCallback, useEffect, useRef } from "react";
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
import {
  AlignHorizontalDistributeCenter, Map,
  Search, BarChart2, FileText, Download, Globe, Send, Play,
  Cpu, Layers, AlignLeft, Calendar, Workflow, ScanSearch,
  Zap, Wrench, PenLine, CheckCircle2, Star, Database, Filter,
} from "lucide-react";
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
  onAgentInspect?: (agent: StudioAgent) => void;
  /** Step ID whose inspector is currently open — scopes dot expansion */
  activeStepId?: string | null;
  /** Skill ID to highlight/expand in canvas (from inspector) */
  activeSkillId?: string | null;
  /** Tool ID to highlight/expand in canvas (from inspector) */
  activeToolId?: string | null;
}

interface StepNodeData {
  step: FlowStep;
  status: StepStatus;
  index: number;
  onInspect: (step: FlowStep) => void;
  activeSkillId?: string | null;
  activeToolId?: string | null;
}

interface AgentNodeData {
  agent: StudioAgent;
  subAgents: StudioAgent[];
  onInspect: (agent: StudioAgent) => void;
}

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

const PRIMARY_AGENT_COLOR = "#3b82f6";  // blue
const SUB_AGENT_COLOR     = "#818cf8";  // indigo
const SKILL_COLOR         = "#8b5cf6";  // violet
const TOOL_COLOR          = "#f59e0b";  // amber

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return isNaN(r) ? "100,116,139" : `${r},${g},${b}`;
}

function trunc(s: string, max = 13): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Derive a lucide icon for a step based on its name/role keywords */
function StepIcon({ step, color }: { step: FlowStep; color: string }) {
  // If the blueprint/step provided an explicit emoji icon, render it
  if (step.icon && /\p{Emoji}/u.test(step.icon)) {
    return <span style={{ fontSize: 18, lineHeight: 1 }}>{step.icon}</span>;
  }

  const key = `${step.name} ${step.agentRole ?? ""}`.toLowerCase();
  const sz  = 20;
  const props = { size: sz, color, strokeWidth: 1.8 };

  if (/search|find|discover|lookup|look.?up|query/.test(key))         return <Search {...props} />;
  if (/web|scrape|crawl|browse|fetch.*url|browser/.test(key))         return <Globe {...props} />;
  if (/analys|evaluate|assess|measure|metric|insight/.test(key))      return <BarChart2 {...props} />;
  if (/report|generat|produc|output|render|markdown/.test(key))       return <FileText {...props} />;
  if (/extract|parse|retriev|download|collect|gather/.test(key))      return <Download {...props} />;
  if (/review|check|valida|verify|audit|quality/.test(key))           return <CheckCircle2 {...props} />;
  if (/identif|detect|classif|categoris|categoriz|recogni/.test(key)) return <ScanSearch {...props} />;
  if (/rank|score|rate|compar|benchmark|prioriti/.test(key))          return <Star {...props} />;
  if (/write|draft|compose|creat|author/.test(key))                   return <PenLine {...props} />;
  if (/send|notif|deliver|email|message|alert/.test(key))             return <Send {...props} />;
  if (/run|execut|trigger|launch|start/.test(key))                    return <Play {...props} />;
  if (/transform|convert|process|compute/.test(key))                  return <Cpu {...props} />;
  if (/layer|organis|organiz|sort|group|cluster/.test(key))           return <Layers {...props} />;
  if (/summar|condense|distil|abstract/.test(key))                    return <AlignLeft {...props} />;
  if (/plan|schedul|coordinat|allocat/.test(key))                     return <Calendar {...props} />;
  if (/skill|zap|action/.test(key))                                   return <Zap {...props} />;
  if (/tool|wrench|api|integrat/.test(key))                           return <Wrench {...props} />;
  if (/data|database|storage|store/.test(key))                        return <Database {...props} />;
  if (/filter|refin|narrow|select/.test(key))                         return <Filter {...props} />;

  return <Workflow {...props} />;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const STEP_SIZE         = 68;
const STEP_SPACING      = 160;
const PRIMARY_SIZE      = 60;
const SUB_SIZE          = 44;
const AGENT_GAP         = 20;    // between agents of same tier
const AGENT_STEP_GAP    = 60;    // gap between last primary and first step
const SUB_OFFSET_Y      = 90;    // how far below primary the subs sit

// ─── Skill/Tool expandable dots ───────────────────────────────────────────────

const DOT_COLLAPSED = 10;
const DOT_EXPANDED  = 34;

interface DotItem { id: string; name: string }

function SkillToolDots({
  items, color, icon, expanded, activeId, onToggle,
}: {
  items: DotItem[];
  color: string;
  icon: string;
  expanded: boolean;
  activeId?: string | null;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  const isActive = activeId ? items.some((i) => i.id === activeId) : false;
  const show = expanded || isActive;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: show ? 6 : 4, flexWrap: "wrap",
        maxWidth: STEP_SIZE + 40, cursor: "pointer",
      }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      title={show ? "Collapse" : items.map((i) => i.name).join(", ")}
    >
      {items.map((item) => {
        const isItemActive = activeId === item.id;
        return (
          <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{
              width:        show ? DOT_EXPANDED : DOT_COLLAPSED,
              height:       show ? DOT_EXPANDED : DOT_COLLAPSED,
              borderRadius: "50%",
              background:   show ? `rgba(${hexToRgb(color)},0.14)` : color,
              border:       show ? `${isItemActive ? 2 : 1.5}px solid ${color}` : "none",
              display:      "flex", alignItems: "center", justifyContent: "center",
              transition:   "all 0.18s ease",
              flexShrink:   0,
              boxShadow:    isItemActive ? `0 0 8px ${color}55` : "none",
            }}>
              {show && <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>}
            </div>
            {show && (
              <span style={{
                fontSize: 8, color, fontWeight: 600, textAlign: "center",
                maxWidth: DOT_EXPANDED + 12,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {trunc(item.name, 10)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step Node ────────────────────────────────────────────────────────────────

function StepNode({ data }: { data: StepNodeData }) {
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  const [toolsExpanded,  setToolsExpanded]  = useState(false);

  // Auto-expand when an active id matches one of this node's items
  useEffect(() => {
    if (data.activeSkillId && data.step.skills?.some((s) => s.id === data.activeSkillId)) {
      setSkillsExpanded(true);
    }
  }, [data.activeSkillId, data.step.skills]);

  useEffect(() => {
    if (data.activeToolId && data.step.tools?.some((t) => t.id === data.activeToolId)) {
      setToolsExpanded(true);
    }
  }, [data.activeToolId, data.step.tools]);

  // Collapse when active id clears
  useEffect(() => {
    if (!data.activeSkillId) setSkillsExpanded(false);
  }, [data.activeSkillId]);
  useEffect(() => {
    if (!data.activeToolId) setToolsExpanded(false);
  }, [data.activeToolId]);

  const color  = STATUS_COLOR[data.status] ?? STATUS_COLOR.idle;
  const pulse  = data.status === "running";
  const skills = data.step.skills ?? [];
  const tools  = data.step.tools  ?? [];
  const role   = data.step.agentRole?.toUpperCase() ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Labels above */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginBottom: 4, minHeight: 22 }}>
        <span style={{ fontSize: 8, color: "var(--foreground)", opacity: 0.32, fontWeight: 600, letterSpacing: "0.06em" }}>
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
          <SkillToolDots items={skills} color={SKILL_COLOR} icon="⚡"
            expanded={skillsExpanded}
            activeId={data.activeSkillId}
            onToggle={() => setSkillsExpanded((v) => !v)} />
        </div>
      )}

      {/* Main circle */}
      <div style={{ position: "relative" }}>
        <Handle type="target" position={Position.Left}
          style={{ background: color, width: 7, height: 7, border: "none", left: -3 }} />
        <Handle type="source" position={Position.Right}
          style={{ background: color, width: 7, height: 7, border: "none", right: -3 }} />

        <div onClick={() => data.onInspect(data.step)} style={{
          width: STEP_SIZE, height: STEP_SIZE, borderRadius: "50%",
          border: `2px solid ${color}`,
          background: `rgba(${hexToRgb(color)},0.11)`,
          boxShadow: pulse
            ? `0 0 0 4px ${color}30, 0 0 18px ${color}28`
            : `0 0 0 3px ${color}14, 0 2px 8px rgba(0,0,0,0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", position: "relative", transition: "box-shadow 0.2s", flexShrink: 0,
        }}>
          {pulse && (
            <span style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: `2px solid ${color}`, opacity: 0.45,
              animation: "flowPulse 1.4s ease-in-out infinite", pointerEvents: "none",
            }} />
          )}
          <StepIcon step={data.step} color={color} />
        </div>
      </div>

      {/* Tool dots — below circle */}
      {tools.length > 0 && (
        <div style={{ marginTop: 5 }}>
          <SkillToolDots items={tools} color={TOOL_COLOR} icon="⚙"
            expanded={toolsExpanded}
            activeId={data.activeToolId}
            onToggle={() => setToolsExpanded((v) => !v)} />
        </div>
      )}

      {/* Name below */}
      <div style={{
        marginTop: 6, fontSize: 9, fontWeight: 600,
        color: "var(--foreground)", opacity: 0.7, textAlign: "center",
        maxWidth: STEP_SIZE + 28, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {trunc(data.step.name, 16)}
      </div>
    </div>
  );
}

// ─── Agent Node ───────────────────────────────────────────────────────────────

const DOT_AGENT_EXPANDED = 28;

function AgentOrbiters({
  subAgents, onInspect,
}: {
  subAgents: StudioAgent[];
  onInspect: (agent: StudioAgent) => void;
}) {
  if (subAgents.length === 0) return null;
  const color = SUB_AGENT_COLOR;
  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 6, marginTop: 6 }}
    >
      {subAgents.map((sub) => (
        <div
          key={sub.id}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); onInspect(sub); }}
        >
          <div style={{
            width: DOT_AGENT_EXPANDED, height: DOT_AGENT_EXPANDED,
            borderRadius: "50%",
            background: `rgba(${hexToRgb(color)},0.12)`,
            border: `1.5px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>
              {sub.label.charAt(0).toUpperCase()}
            </span>
          </div>
          <span style={{
            fontSize: 7, color, fontWeight: 600, textAlign: "center",
            maxWidth: 38, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {trunc(sub.label, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}

function AgentNode({ data }: { data: AgentNodeData }) {
  const { agent, subAgents, onInspect } = data;
  const color = PRIMARY_AGENT_COLOR;
  const size  = PRIMARY_SIZE;


  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
      onClick={() => onInspect(agent)}
    >
      {/* Type label */}
      <div style={{ marginBottom: 4, minHeight: 20, display: "flex", alignItems: "flex-end" }}>
        <span style={{ fontSize: 8, color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", opacity: 0.8 }}>
          AGENT
        </span>
      </div>

      {/* Circle */}
      <div style={{ position: "relative" }}>
        <Handle type="source" position={Position.Right}
          style={{ background: color, width: 7, height: 7, border: "none", right: -3 }} />
        <Handle type="target" position={Position.Left}
          style={{ background: color, width: 6, height: 6, border: "none", left: -2 }} />

        <div style={{
          width: size, height: size, borderRadius: "50%",
          border: `2px solid ${color}`,
          borderStyle: agent.linked ? "solid" : "dashed",
          background: `rgba(${hexToRgb(color)},0.11)`,
          boxShadow: `0 0 0 3px ${color}18, 0 2px 10px ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "box-shadow 0.15s",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1, opacity: 0.9 }}>
            {agent.label.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Name below */}
      <div style={{
        marginTop: 5, fontSize: 9, fontWeight: 600,
        color: "var(--foreground)", opacity: 0.65, textAlign: "center",
        maxWidth: size + 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {trunc(agent.label, 12)}
      </div>

      {/* Sub-agent orbiters — always expanded */}
      <AgentOrbiters
        subAgents={subAgents}
        onInspect={onInspect}
      />
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
  onAgentInspect: (agent: StudioAgent) => void,
  activeSkillId?: string | null,
  activeToolId?: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const primaryAgents = agents.filter(
    (a) => a.isPrimary !== false && !a.id.startsWith("specialist-"),
  );
  const subAgents = agents.filter(
    (a) => a.isPrimary === false || a.id.startsWith("specialist-"),
  );

  // ── Primary agents: inline left of first step ──────────────────────────────
  const firstStepId = steps[0]?.id;
  primaryAgents.forEach((agent, i) => {
    const agentId = `agent-${agent.id}`;
    const x = -(primaryAgents.length - i) * (PRIMARY_SIZE + AGENT_GAP) - AGENT_STEP_GAP;
    nodes.push({
      id: agentId, type: "agentNode",
      position: { x, y: 0 },
      data: { agent, subAgents, onInspect: onAgentInspect } satisfies AgentNodeData,
    });

    // Edge to next primary or first step
    const target = i === primaryAgents.length - 1
      ? firstStepId
      : `agent-${primaryAgents[i + 1]?.id}`;
    if (target) {
      edges.push({
        id: `primary-edge-${agentId}`,
        source: agentId, target,
        style: {
          stroke: PRIMARY_AGENT_COLOR, strokeWidth: 1.5,
          strokeDasharray: agent.linked ? undefined : "4 3",
        },
      });
    }
  });

  // ── Step nodes ─────────────────────────────────────────────────────────────
  steps.forEach((step, i) => {
    const status: StepStatus = (statuses[step.id] as StepStatus) ?? "idle";
    nodes.push({
      id: step.id, type: "stepNode",
      position: { x: i * STEP_SPACING, y: 0 },
      data: {
        step, status, index: i,
        onInspect: onStepInspect,
        activeSkillId, activeToolId,
      } satisfies StepNodeData,
    });

    if (i > 0) {
      edges.push({
        id: `step-edge-${i}`,
        source: steps[i - 1].id, target: step.id,
        style: { stroke: "#334155", strokeWidth: 1.5 },
        animated: status === "running",
      });
    }
  });

  return { nodes, edges };
}

// ─── Compute rest positions ───────────────────────────────────────────────────

function computeRestPositions(agents: StudioAgent[], steps: FlowStep[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const primaryAgents = agents.filter((a) => a.isPrimary !== false && !a.id.startsWith("specialist-"));

  primaryAgents.forEach((agent, i) => {
    const x = -(primaryAgents.length - i) * (PRIMARY_SIZE + AGENT_GAP) - AGENT_STEP_GAP;
    positions[`agent-${agent.id}`] = { x, y: 0 };
  });

  steps.forEach((step, i) => {
    positions[step.id] = { x: i * STEP_SPACING, y: 0 };
  });
  return positions;
}

// ─── BTN style ────────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26,
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: 5, cursor: "pointer",
  color: "var(--muted-foreground)",
};

// ─── Inner canvas ─────────────────────────────────────────────────────────────

function FlowCanvasInner({
  steps, agents, stepStatuses = {}, onStepInspect, onAgentInspect,
  activeStepId, activeSkillId, activeToolId,
}: FlowCanvasProps) {
  const { fitView } = useReactFlow();
  const [showMinimap, setShowMinimap] = useState(false);

  const noop       = useCallback((_: FlowStep) => {}, []);
  const noopAgent  = useCallback((_: StudioAgent) => {}, []);
  const inspect    = onStepInspect ?? noop;
  const inspectAgt = onAgentInspect ?? noopAgent;

  const stepKey  = steps.map((s) => s.id).join(",");
  const agentKey = agents.map((a) => a.id).join(",");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Rest positions for spring gravity
  const restRef = useRef<Record<string, { x: number; y: number }>>({});
  // Per-node velocity
  const velRef  = useRef<Record<string, { vx: number; vy: number }>>({});
  // RAF id
  const rafRef  = useRef<number>(0);
  // Dragging flag per node
  const draggingRef = useRef<Set<string>>(new Set());

  // ── (Re-)build on step/agent set change ────────────────────────────────────
  useEffect(() => {
    const { nodes: n, edges: e } = buildNodesEdges(
      steps, agents, stepStatuses, inspect, inspectAgt, activeSkillId, activeToolId,
    );
    restRef.current = computeRestPositions(agents, steps);
    velRef.current  = {};
    setNodes(n);
    setEdges(e);
    setTimeout(() => fitView({ padding: 0.32, duration: 420 }), 60);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, agentKey]);

  // ── Sync status colors without rebuilding ──────────────────────────────────
  useEffect(() => {
    setNodes((prev) => prev.map((node) => {
      if (node.type !== "stepNode") return node;
      const status: StepStatus = (stepStatuses[node.id] as StepStatus) ?? "idle";
      if ((node.data as StepNodeData).status === status) return node;
      return { ...node, data: { ...node.data, status } };
    }));
    setEdges((prev) => prev.map((edge) => {
      if (!edge.target || edge.id.startsWith("primary-edge-") || edge.id.startsWith("sub-edge-")) return edge;
      const s: StepStatus = (stepStatuses[edge.target] as StepStatus) ?? "idle";
      return { ...edge, animated: s === "running" };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stepStatuses)]);

  // ── Sync activeSkillId / activeToolId into node data ──────────────────────
  // Only expand the dot on the specific step that's open in the inspector.
  useEffect(() => {
    setNodes((prev) => prev.map((node) => {
      if (node.type !== "stepNode") return node;
      const isActive = !activeStepId || node.id === activeStepId;
      return {
        ...node,
        data: {
          ...node.data,
          activeSkillId: isActive ? activeSkillId : null,
          activeToolId:  isActive ? activeToolId  : null,
        },
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepId, activeSkillId, activeToolId]);

  // ── Spring gravity RAF loop ────────────────────────────────────────────────
  useEffect(() => {
    const K    = 0.022;  // spring constant — gentle
    const DAMP = 0.84;   // velocity damping per frame
    const THRESHOLD = 0.25;

    function tick() {
      setNodes((prev) => {
        let dirty = false;
        const next = prev.map((node) => {
          if (draggingRef.current.has(node.id)) return node;
          const rest = restRef.current[node.id];
          if (!rest) return node;
          const dx = rest.x - node.position.x;
          const dy = rest.y - node.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < THRESHOLD) return node;
          if (!velRef.current[node.id]) velRef.current[node.id] = { vx: 0, vy: 0 };
          const v = velRef.current[node.id];
          v.vx = (v.vx + dx * K) * DAMP;
          v.vy = (v.vy + dy * K) * DAMP;
          if (Math.abs(v.vx) < 0.01 && Math.abs(v.vy) < 0.01 && dist < THRESHOLD) return node;
          dirty = true;
          return { ...node, position: { x: node.position.x + v.vx, y: node.position.y + v.vy } };
        });
        return dirty ? next : prev;
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = useCallback(() => {
    restRef.current = computeRestPositions(agents, steps);
    velRef.current  = {};
    setNodes((prev) => prev.map((n) => {
      const r = restRef.current[n.id];
      return r ? { ...n, position: r } : n;
    }));
    setTimeout(() => fitView({ padding: 0.32, duration: 400 }), 50);
  }, [agents, steps, setNodes, fitView]);

  return (
    <>
      <style>{`
        @keyframes flowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.06); }
        }
        .grace-flow-btn:hover { color: var(--foreground) !important; background: var(--accent) !important; }
        .react-flow__controls  { bottom: 16px; left: 16px; }
        .react-flow__minimap   { bottom: 50px; right: 16px; border-radius: 8px; overflow: hidden; }
        .react-flow__background { opacity: 0.4; }
      `}</style>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeDragStart={(_, node) => { draggingRef.current.add(node.id); velRef.current[node.id] = { vx: 0, vy: 0 }; }}
        onNodeDragStop={(_, node) => {
          draggingRef.current.delete(node.id);
          restRef.current[node.id] = { x: node.position.x, y: node.position.y };
          velRef.current[node.id]  = { vx: 0, vy: 0 };
        }}
        nodeTypes={NODE_TYPES}
        fitView fitViewOptions={{ padding: 0.32 }}
        minZoom={0.12} maxZoom={2.5}
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
              if (node.type === "agentNode") return PRIMARY_AGENT_COLOR;
              return STATUS_COLOR[(node.data as StepNodeData)?.status ?? "idle"] ?? "#475569";
            }}
            maskColor="rgba(0,0,0,0.6)"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          />
        )}

        <Panel position="top-right" style={{ top: 8, right: 8, margin: 0, display: "flex", gap: 6 }}>
          <button type="button" className="grace-flow-btn"
            style={{ ...BTN, color: showMinimap ? "var(--foreground)" : undefined }}
            title={showMinimap ? "Hide minimap" : "Show minimap"}
            onClick={() => setShowMinimap((v) => !v)}
          >
            <Map size={13} />
          </button>
          <button type="button" className="grace-flow-btn" style={BTN}
            title="Reset layout" onClick={handleReset}>
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
