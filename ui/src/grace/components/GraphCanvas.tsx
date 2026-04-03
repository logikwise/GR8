/**
 * GraphCanvas — Phase 4
 *
 * Force-directed graph visualisation for Studio.
 * Uses a lightweight custom 2D physics simulation (no external deps).
 *
 * Node types: agent | step | skill | tool | output
 *   - agent nodes: diamond shape
 *     - linked=true  → solid stroke
 *     - linked=false → dashed stroke + dotted edge to steps
 *
 * Edges:
 *   - step → step        (solid)
 *   - agent → step       (solid if linked, dashed if not)
 *   - step → skill/tool  (solid)
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

  // Position agents in an arc at the top of the canvas
  const agentSpread = agents.length > 1
    ? (Math.PI * 0.7) / (agents.length - 1)
    : 0;
  const agentStartAngle = -Math.PI / 2 - (agents.length > 1 ? (Math.PI * 0.35) : 0);
  const agentR = Math.min(cx, cy) * 0.7;

  agents.forEach((agent, i) => {
    const angle = agents.length === 1
      ? -Math.PI / 2
      : agentStartAngle + i * agentSpread;
    addNode({
      id: `agent-${agent.id}`,
      label: agent.label,
      type: "agent",
      linked: agent.linked,
      x: cx + agentR * Math.cos(angle) + (Math.random() - 0.5) * 10,
      y: cy + agentR * Math.sin(angle) + (Math.random() - 0.5) * 10,
      vx: 0, vy: 0,
      radius: 18,
    });
  });

  // Steps in a ring slightly lower
  const angleSpread = steps.length > 1 ? (2 * Math.PI) / steps.length : 0;
  const stepR = Math.min(cx, cy) * 0.38;

  steps.forEach((step, i) => {
    const angle = i * angleSpread - Math.PI / 2 + (steps.length > 1 ? 0.15 : 0);
    addNode({
      id: `step-${step.id}`,
      label: step.name,
      type: "step",
      stepRef: step,
      x: cx + stepR * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + stepR * Math.sin(angle) + (Math.random() - 0.5) * 20,
      vx: 0, vy: 0,
      radius: 22,
    });

    // Step → step edges
    if (i > 0) {
      edges.push({
        source: `step-${steps[i - 1].id}`,
        target: `step-${step.id}`,
        linked: true,
      });
    }

    // Agent → step edges: match by role
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

    // If no agents at all, still show step→skill/tool
    step.skills?.forEach((skill) => {
      const sid = `skill-${skill.id}`;
      addNode({
        id: sid, label: skill.name, type: "skill",
        x: cx + stepR * Math.cos(angle) + 70 + (Math.random() - 0.5) * 40,
        y: cy + stepR * Math.sin(angle) - 35 + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0, radius: 12,
      });
      edges.push({ source: `step-${step.id}`, target: sid, linked: true });
    });

    step.tools?.forEach((tool) => {
      const tid = `tool-${tool.id}`;
      addNode({
        id: tid, label: tool.name, type: "tool",
        x: cx + stepR * Math.cos(angle) + 70 + (Math.random() - 0.5) * 40,
        y: cy + stepR * Math.sin(angle) + 35 + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0, radius: 11,
      });
      edges.push({ source: `step-${step.id}`, target: tid, linked: true });
    });
  });

  return { nodes, edges };
}

// ─── Physics ──────────────────────────────────────────────────────────────────

const REPULSION = 2000;
const SPRING_K = 0.04;
const SPRING_REST_STEP = 120;
const SPRING_REST_AGENT = 160;
const SPRING_REST_LEAF = 70;
const GRAVITY = 0.01;
const DAMPING = 0.88;
const MIN_DIST = 30;

function tickPhysics(nodes: GraphNode[], edges: GraphEdge[], cx: number, cy: number) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      a.vx -= fx; a.vy -= fy;
      b.vx += fx; b.vy += fy;
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
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  for (const n of nodes) {
    n.vx += (cx - n.x) * GRAVITY;
    n.vy += (cy - n.y) * GRAVITY;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;
  }
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const NODE_COLOR: Record<NodeType, string> = {
  agent:  "#a78bfa",
  step:   "#a78bfa",
  skill:  "#34d399",
  tool:   "#60a5fa",
  output: "#fb923c",
};

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);

  const initGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resize();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    graphRef.current = buildGraph(steps, agents, cx, cy);
  }, [steps, agents, resize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resize();
    const { width, height } = canvas;
    const { nodes, edges } = graphRef.current;
    const cx = width / 2, cy = height / 2;

    tickPhysics(nodes, edges, cx, cy);
    ctx.clearRect(0, 0, width, height);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const hov = hoveredRef.current;

    const incidentToHovered = new Set<string>();
    if (hov) {
      edges.forEach((e) => {
        if (e.source === hov || e.target === hov) {
          incidentToHovered.add(e.source);
          incidentToHovered.add(e.target);
        }
      });
    }

    // Draw edges
    edges.forEach((edge) => {
      const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target);
      if (!a || !b) return;

      const isHighlighted = hov && (edge.source === hov || edge.target === hov);
      const alpha = hov ? (isHighlighted ? 0.75 : 0.07) : 0.28;

      ctx.save();
      if (edge.dashed) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }

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
        grad.addColorStop(0.5, "rgba(167,139,250,0.5)");
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
      const isHov = node.id === hov;
      const isIncident = incidentToHovered.has(node.id);
      const alpha = hov ? (isHov || isIncident ? 1 : 0.3) : 1;
      const color = NODE_COLOR[node.type];
      const r = node.radius;

      if (isHov) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = color + "18";
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
        // Dashed stroke for unlinked agents
        if (node.linked === false) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = `rgba(150,130,200,${alpha * 0.55})`;
        } else {
          ctx.setLineDash([]);
          ctx.strokeStyle = color + (Math.round(alpha * 0xcc)).toString(16).padStart(2, "0");
        }
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Agent label above node
        const agentLabel = node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label;
        const isLinked = node.linked !== false;
        ctx.fillStyle = isLinked
          ? `rgba(200,185,255,${alpha * 0.9})`
          : `rgba(140,130,160,${alpha * 0.7})`;
        ctx.font = `600 9px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(agentLabel, node.x, node.y - r - 4);

        // "unlinked" sub-label
        if (!isLinked) {
          ctx.fillStyle = `rgba(120,110,140,${alpha * 0.5})`;
          ctx.font = `8px sans-serif`;
          ctx.textBaseline = "bottom";
          ctx.fillText("unlinked", node.x, node.y - r - 14);
        }

      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color + (Math.round(alpha * 0x18)).toString(16).padStart(2, "0");
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
          const idx = steps.findIndex((s) => `step-${s.id}` === node.id);
          if (idx >= 0) ctx.fillText(String(idx + 1), node.x, node.y);
        }

        const fontSize = node.type === "step" ? 10 : 9;
        const maxLabelW = r * 3.5;
        const label = node.label.length > 16 ? node.label.slice(0, 14) + "…" : node.label;
        const yOff = r + fontSize + 2;
        ctx.fillStyle = `rgba(${node.type === "step" ? "240,235,255" : "180,180,180"},${alpha * 0.85})`;
        ctx.font = `${node.type === "step" ? "600 " : ""}${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, node.x, node.y + yOff, maxLabelW);
      }
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [steps, agents, resize]);

  useEffect(() => {
    initGraph();
    rafRef.current = requestAnimationFrame(draw);
    const ro = new ResizeObserver(initGraph);
    if (canvasRef.current) ro.observe(canvasRef.current.parentElement!);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [initGraph, draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { nodes } = graphRef.current;
    let found: string | null = null;
    for (const n of nodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6) { found = n.id; break; }
    }
    hoveredRef.current = found;
    setHoveredId(found);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoveredRef.current = null;
    setHoveredId(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { nodes } = graphRef.current;
    for (const n of nodes) {
      const dx = n.x - mx, dy = n.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < n.radius + 6) {
        if (n.stepRef) onStepInspect(n.stepRef);
        break;
      }
    }
  }, [onStepInspect]);

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
        style={{ cursor: hoveredId ? "pointer" : "default" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
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
          click step · agent dashed = unlinked
        </span>
      </div>
    </div>
  );
}
