/**
 * GraphCanvas — Phase 6 (calm physics rewrite)
 *
 * Changes from Phase 4:
 *  - Physics settles and STOPS — no "shaken snow globe" behavior
 *  - Selecting/hovering a node does NOT restart the simulation
 *  - Rebuilds only when the set of node IDs actually changes
 *  - Resize scales positions proportionally (no full rebuild)
 *  - Draggable nodes with soft local settling
 *  - Single stable RAF loop via stable useEffect([], []) + refs
 *
 * Node types: agent | step | skill | tool | output
 *   - agent nodes: diamond shape
 *     - linked=true  → solid stroke
 *     - linked=false → dashed stroke + dotted edge to steps
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { FlowStep } from "./FlowStepCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = "agent" | "step" | "skill" | "tool" | "output";

export interface StudioAgent {
  id: string;
  label: string;
  role: string;
  linked: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  stepRef?: FlowStep;
  linked?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  linked?: boolean;
  dashed?: boolean;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(
  steps: FlowStep[],
  agents: StudioAgent[],
  cx: number,
  cy: number,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const placed = new Set<string>();

  function addNode(n: GraphNode) {
    if (!placed.has(n.id)) {
      placed.add(n.id);
      nodes.push(n);
    }
  }

  const agentSpread = agents.length > 1
    ? (Math.PI * 0.7) / (agents.length - 1)
    : 0;
  const agentStartAngle = -Math.PI / 2 - (agents.length > 1 ? (Math.PI * 0.35) : 0);
  const agentR = Math.min(cx, cy) * 0.55;

  agents.forEach((agent, i) => {
    const angle = agents.length === 1
      ? -Math.PI / 2
      : agentStartAngle + i * agentSpread;
    addNode({
      id: `agent-${agent.id}`,
      label: agent.label,
      type: "agent",
      linked: agent.linked,
      x: cx + agentR * Math.cos(angle) + (Math.random() - 0.5) * 8,
      y: cy + agentR * Math.sin(angle) + (Math.random() - 0.5) * 8,
      vx: 0, vy: 0,
      radius: 18,
    });
  });

  const angleSpread = steps.length > 1 ? (2 * Math.PI) / steps.length : 0;
  const stepR = Math.min(cx, cy) * 0.32;

  steps.forEach((step, i) => {
    const angle = i * angleSpread - Math.PI / 2 + (steps.length > 1 ? 0.15 : 0);
    addNode({
      id: `step-${step.id}`,
      label: step.name,
      type: "step",
      stepRef: step,
      x: cx + stepR * Math.cos(angle) + (Math.random() - 0.5) * 16,
      y: cy + stepR * Math.sin(angle) + (Math.random() - 0.5) * 16,
      vx: 0, vy: 0,
      radius: 22,
    });

    if (i > 0) {
      edges.push({
        source: `step-${steps[i - 1]!.id}`,
        target: `step-${step.id}`,
        linked: true,
      });
    }

    agents.forEach((agent) => {
      const roleMatch =
        step.agentRole === agent.role ||
        step.agentRole === agent.id ||
        step.agentRole?.toLowerCase() === agent.label.toLowerCase() ||
        (agent.role === "primary" && !step.agentRole);
      if (roleMatch) {
        edges.push({
          source: `agent-${agent.id}`,
          target: `step-${step.id}`,
          linked: agent.linked,
          dashed: !agent.linked,
        });
      }
    });

    step.skills?.forEach((skill) => {
      const sid = `skill-${skill.id}`;
      addNode({
        id: sid, label: skill.name, type: "skill",
        x: cx + stepR * Math.cos(angle) + 65 + (Math.random() - 0.5) * 30,
        y: cy + stepR * Math.sin(angle) - 30 + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0, radius: 12,
      });
      edges.push({ source: `step-${step.id}`, target: sid, linked: true });
    });

    step.tools?.forEach((tool) => {
      const tid = `tool-${tool.id}`;
      addNode({
        id: tid, label: tool.name, type: "tool",
        x: cx + stepR * Math.cos(angle) + 65 + (Math.random() - 0.5) * 30,
        y: cy + stepR * Math.sin(angle) + 30 + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0, radius: 11,
      });
      edges.push({ source: `step-${step.id}`, target: tid, linked: true });
    });
  });

  return { nodes, edges };
}

// ─── Physics ──────────────────────────────────────────────────────────────────

const REPULSION = 2200;
const SPRING_K = 0.035;
const SPRING_REST_STEP = 120;
const SPRING_REST_AGENT = 150;
const SPRING_REST_LEAF = 65;
const GRAVITY = 0.008;
const DAMPING = 0.82;  // higher = settles faster
const MIN_DIST = 28;
const SETTLED_THRESHOLD = 0.025;

function tickPhysics(nodes: GraphNode[], edges: GraphEdge[], cx: number, cy: number) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!, b = nodes[j]!;
      if (a.pinned && b.pinned) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
      if (!b.pinned) { b.vx += fx; b.vy += fy; }
    }
  }

  for (const edge of edges) {
    const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const isAgentEdge = a.type === "agent" || b.type === "agent";
    const isStepEdge = a.type === "step" && b.type === "step";
    const rest = isAgentEdge ? SPRING_REST_AGENT : isStepEdge ? SPRING_REST_STEP : SPRING_REST_LEAF;
    const stretch = dist - rest;
    const fx = (dx / dist) * stretch * SPRING_K;
    const fy = (dy / dist) * stretch * SPRING_K;
    if (!a.pinned) { a.vx += fx; a.vy += fy; }
    if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
  }

  for (const n of nodes) {
    if (n.pinned) continue;
    n.vx += (cx - n.x) * GRAVITY;
    n.vy += (cy - n.y) * GRAVITY;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }
}

function computeEnergy(nodes: GraphNode[]): number {
  let e = 0;
  for (const n of nodes) e += Math.abs(n.vx) + Math.abs(n.vy);
  return e;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const NODE_COLOR: Record<NodeType, string> = {
  agent:  "#a78bfa",
  step:   "#a78bfa",
  skill:  "#34d399",
  tool:   "#60a5fa",
  output: "#fb923c",
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  nodes: GraphNode[],
  edges: GraphEdge[],
  hoveredId: string | null,
  stepsArr: FlowStep[],
) {
  ctx.clearRect(0, 0, w, h);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const incidentToHovered = new Set<string>();
  if (hoveredId) {
    edges.forEach((e) => {
      if (e.source === hoveredId || e.target === hoveredId) {
        incidentToHovered.add(e.source);
        incidentToHovered.add(e.target);
      }
    });
  }

  // Draw edges
  edges.forEach((edge) => {
    const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
    if (!a || !b) return;

    const isHighlighted = hoveredId && (edge.source === hoveredId || edge.target === hoveredId);
    const alpha = hoveredId ? (isHighlighted ? 0.75 : 0.06) : 0.26;

    ctx.save();
    ctx.setLineDash(edge.dashed ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
    ctx.lineWidth = isHighlighted ? 1.5 : 1;
    ctx.stroke();

    if (isHighlighted) {
      ctx.setLineDash([]);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, "rgba(167,139,250,0)");
      grad.addColorStop(0.5, "rgba(167,139,250,0.45)");
      grad.addColorStop(1, "rgba(167,139,250,0)");
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  });

  // Draw nodes
  nodes.forEach((node) => {
    const isHov = node.id === hoveredId;
    const isIncident = incidentToHovered.has(node.id);
    const alpha = hoveredId ? (isHov || isIncident ? 1 : 0.28) : 1;
    const color = NODE_COLOR[node.type];
    const r = node.radius;

    if (isHov) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
      ctx.fillStyle = color + "14";
      ctx.fill();
    }

    if (node.type === "agent") {
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      const s = r * 0.8;
      ctx.rect(-s, -s, s * 2, s * 2);
      ctx.fillStyle = color + (Math.round(alpha * 0x1a)).toString(16).padStart(2, "0");
      ctx.fill();
      if (node.linked === false) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = `rgba(150,130,200,${alpha * 0.5})`;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = color + (Math.round(alpha * 0xcc)).toString(16).padStart(2, "0");
      }
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      const agentLabel = node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label;
      const isLinked = node.linked !== false;
      ctx.fillStyle = isLinked
        ? `rgba(200,185,255,${alpha * 0.9})`
        : `rgba(140,130,160,${alpha * 0.65})`;
      ctx.font = `600 9px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(agentLabel, node.x, node.y - r - 4);

      if (!isLinked) {
        ctx.fillStyle = `rgba(120,110,140,${alpha * 0.5})`;
        ctx.font = `8px sans-serif`;
        ctx.textBaseline = "bottom";
        ctx.fillText("unlinked", node.x, node.y - r - 14);
      }

    } else {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color + (Math.round(alpha * 0x16)).toString(16).padStart(2, "0");
      ctx.fill();
      ctx.setLineDash([]);
      ctx.strokeStyle = color + (Math.round(alpha * 0xbb)).toString(16).padStart(2, "0");
      ctx.lineWidth = node.type === "step" ? 2 : 1.2;
      ctx.stroke();

      if (node.type === "step") {
        ctx.fillStyle = `rgba(167,139,250,${alpha * 0.9})`;
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const idx = stepsArr.findIndex((s) => `step-${s.id}` === node.id);
        if (idx >= 0) ctx.fillText(String(idx + 1), node.x, node.y);
      }

      const fontSize = node.type === "step" ? 10 : 9;
      const maxLabelW = r * 3.5;
      const label = node.label.length > 16 ? node.label.slice(0, 14) + "…" : node.label;
      const yOff = r + fontSize + 2;
      ctx.fillStyle = `rgba(${node.type === "step" ? "240,235,255" : "180,180,180"},${alpha * 0.82})`;
      ctx.font = `${node.type === "step" ? "600 " : ""}${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(label, node.x, node.y + yOff, maxLabelW);
    }
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GraphCanvasProps {
  steps: FlowStep[];
  agents: StudioAgent[];
  onStepInspect: (step: FlowStep) => void;
}

export function GraphCanvas({ steps, agents, onStepInspect }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<GraphData>({ nodes: [], edges: [] });
  const rafRef = useRef<number>(0);
  const hoveredRef = useRef<string | null>(null);
  const settledRef = useRef(false);
  const lastNodeKeyRef = useRef("");
  // Stable refs — always current, never cause callback recreation
  const stepsRef = useRef(steps);
  const agentsRef = useRef(agents);
  const onInspectRef = useRef(onStepInspect);
  const draggingRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Keep refs in sync (does NOT recreate any callbacks)
  stepsRef.current = steps;
  agentsRef.current = agents;
  onInspectRef.current = onStepInspect;

  // Rebuild graph only when the SET of node IDs changes
  useEffect(() => {
    const newKey = [
      ...steps.map((s) => `s:${s.id}`),
      ...agents.map((a) => `a:${a.id}`),
    ].join("|");
    if (newKey === lastNodeKeyRef.current) return;
    lastNodeKeyRef.current = newKey;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    canvas.width = r.width || 600;
    canvas.height = r.height || 400;
    graphRef.current = buildGraph(steps, agents, canvas.width / 2, canvas.height / 2);
    settledRef.current = false;
  }, [steps, agents]);

  // Single stable RAF loop — never recreated
  useEffect(() => {
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

      // Handle resize by scaling positions (no rebuild)
      const br = canvas.getBoundingClientRect();
      const rw = Math.round(br.width);
      const rh = Math.round(br.height);
      if (rw > 0 && rh > 0 && (canvas.width !== rw || canvas.height !== rh)) {
        const sx = rw / canvas.width;
        const sy = rh / canvas.height;
        for (const n of graphRef.current.nodes) {
          n.x *= sx;
          n.y *= sy;
        }
        canvas.width = rw;
        canvas.height = rh;
        settledRef.current = false;
      }

      const { nodes, edges } = graphRef.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Only run physics if not settled
      if (!settledRef.current) {
        tickPhysics(nodes, edges, cx, cy);
        const energy = computeEnergy(nodes);
        if (energy < nodes.length * SETTLED_THRESHOLD) {
          for (const n of nodes) { n.vx = 0; n.vy = 0; }
          settledRef.current = true;
        }
      }

      renderFrame(ctx, canvas.width, canvas.height, nodes, edges, hoveredRef.current, stepsRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // Intentionally empty — stable forever

  // Mouse: hover (does NOT touch physics or settledRef)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Handle drag
    if (draggingRef.current) {
      const node = graphRef.current.nodes.find((n) => n.id === draggingRef.current!.nodeId);
      if (node) {
        node.x = mx;
        node.y = my;
        node.vx = 0;
        node.vy = 0;
        // Allow gentle local re-settling around dragged node only
        settledRef.current = false;
      }
      return;
    }

    let found: string | null = null;
    for (const n of graphRef.current.nodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6) { found = n.id; break; }
    }
    hoveredRef.current = found;
    setHoveredId(found);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredId(null);
    draggingRef.current = null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const n of graphRef.current.nodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6) {
        draggingRef.current = { nodeId: n.id, startX: mx, startY: my };
        break;
      }
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const startX = draggingRef.current.startX;
    const startY = draggingRef.current.startY;
    draggingRef.current = null;

    // If barely moved, treat as click
    if (Math.abs(mx - startX) < 5 && Math.abs(my - startY) < 5) {
      for (const n of graphRef.current.nodes) {
        const dx = n.x - mx, dy = n.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6) {
          if (n.stepRef) onInspectRef.current(n.stepRef);
          break;
        }
      }
    }
  }, []);

  if (steps.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
        <p className="text-sm text-muted-foreground/40">No nodes to display.</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: draggingRef.current ? "grabbing" : hoveredId ? "pointer" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 pointer-events-none select-none">
        {(["agent", "step", "skill", "tool"] as NodeType[]).map((t) => (
          <div key={t} className="flex items-center gap-1">
            {t === "agent" ? (
              <span
                className="inline-block"
                style={{
                  width: 8, height: 8,
                  transform: "rotate(45deg)",
                  background: NODE_COLOR.agent + "33",
                  border: `1px solid ${NODE_COLOR.agent}88`,
                }}
              />
            ) : (
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: NODE_COLOR[t] + "aa", border: `1px solid ${NODE_COLOR[t]}` }}
              />
            )}
            <span className="text-[9px] text-muted-foreground/40 capitalize">{t}</span>
          </div>
        ))}
        <span className="text-[9px] text-muted-foreground/25 ml-1">
          drag to reposition · click step to inspect
        </span>
      </div>
    </div>
  );
}
