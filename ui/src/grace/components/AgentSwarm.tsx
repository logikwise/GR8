/**
 * AgentSwarm — Phase 4
 *
 * Ambient canvas background showing a constellation of agent nodes.
 * Layered BEHIND all content: pointer-events-none, aria-hidden.
 *
 * Physics:
 *   - nodes drift slowly with gentle random velocity perturbation
 *   - light connection lines appear when two nodes come within CONNECT_DIST
 *   - edges fade in/out with distance
 *   - nodes bounce softly off canvas edges
 *
 * Used by:
 *   - Home (subtle, low opacity)
 *   - Workspace (more prominent)
 *
 * Future hooks:
 *   - swap mock data for live agent list from API
 *   - `status` prop per node for colour coding
 *   - click/hover interaction (set interactive=true to enable)
 *   - toggle visibility via grace.showSwarm localStorage key
 */

import { useRef, useEffect, useCallback } from "react";

export interface SwarmAgent {
  id: string;
  name: string;
  type: "primary" | "specialist" | "observer";
  platform?: string;
}

export const MOCK_SWARM_AGENTS: SwarmAgent[] = [
  { id: "a1", name: "Analyst",    type: "primary",    platform: "openclaw" },
  { id: "a2", name: "Researcher", type: "specialist", platform: "openclaw" },
  { id: "a3", name: "Writer",     type: "specialist", platform: "openclaw" },
  { id: "a4", name: "Reviewer",   type: "observer",   platform: "openclaw" },
  { id: "a5", name: "Planner",    type: "primary",    platform: "openclaw" },
  { id: "a6", name: "Executor",   type: "specialist", platform: "openclaw" },
  { id: "a7", name: "Monitor",    type: "observer",   platform: "openclaw" },
  { id: "a8", name: "Auditor",    type: "observer",   platform: "openclaw" },
];

const CONNECT_DIST = 160;
const SPEED_SCALE = 0.18;

interface SwarmNode {
  id: string;
  type: SwarmAgent["type"];
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

function initNodes(agents: SwarmAgent[], w: number, h: number): SwarmNode[] {
  return agents.map((a, i) => ({
    id: a.id,
    type: a.type,
    x: 80 + Math.random() * (w - 160),
    y: 80 + Math.random() * (h - 160),
    vx: (Math.random() - 0.5) * SPEED_SCALE,
    vy: (Math.random() - 0.5) * SPEED_SCALE,
    r: a.type === "primary" ? 6 : a.type === "specialist" ? 4.5 : 3.5,
    phase: (i / agents.length) * Math.PI * 2,
  }));
}

const TYPE_COLOR: Record<SwarmAgent["type"], string> = {
  primary:    "167,139,250",
  specialist: "96,165,250",
  observer:   "100,180,180",
};

interface AgentSwarmProps {
  agents?: SwarmAgent[];
  opacity?: number;
  className?: string;
}

export function AgentSwarm({ agents = MOCK_SWARM_AGENTS, opacity = 1, className }: AgentSwarmProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SwarmNode[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return false;
    const { width, height } = c.getBoundingClientRect();
    if (c.width !== width || c.height !== height) {
      c.width = Math.max(width, 1);
      c.height = Math.max(height, 1);
      nodesRef.current = initNodes(agents, c.width, c.height);
      return true;
    }
    return false;
  }, [agents]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    resize();
    const { width, height } = c;
    timeRef.current += 0.008;
    const t = timeRef.current;

    ctx.clearRect(0, 0, width, height);

    const nodes = nodesRef.current;

    for (const n of nodes) {
      n.vx += (Math.random() - 0.5) * 0.002;
      n.vy += (Math.random() - 0.5) * 0.002;
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > SPEED_SCALE * 1.5) { n.vx *= 0.95; n.vy *= 0.95; }
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < n.r + 20) { n.x = n.r + 20; n.vx = Math.abs(n.vx); }
      if (n.x > width - n.r - 20) { n.x = width - n.r - 20; n.vx = -Math.abs(n.vx); }
      if (n.y < n.r + 20) { n.y = n.r + 20; n.vy = Math.abs(n.vy); }
      if (n.y > height - n.r - 20) { n.y = height - n.r - 20; n.vy = -Math.abs(n.vy); }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.12 * opacity;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      const col = TYPE_COLOR[n.type];
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.7 + n.phase);
      const glowAlpha = 0.06 + pulse * 0.06;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${glowAlpha * opacity})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},${(0.12 + pulse * 0.08) * opacity})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${col},${(0.3 + pulse * 0.2) * opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [resize, opacity]);

  useEffect(() => {
    resize();
    rafRef.current = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => resize());
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [resize, draw]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      style={{ pointerEvents: "none" }}
    />
  );
}
