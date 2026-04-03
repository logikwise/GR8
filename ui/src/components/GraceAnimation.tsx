import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
  type: "agent" | "skill" | "output";
}

const NODE_COUNT = 38;
const CONNECTION_DISTANCE = 160;
const AGENT_COLOR = "rgba(167, 139, 250,"; // violet-400
const SKILL_COLOR = "rgba(139, 92, 246,";  // violet-500
const OUTPUT_COLOR = "rgba(196, 181, 253,"; // violet-300
const LINE_COLOR = "rgba(139, 92, 246,";

const LABEL_WORDS = [
  "agent", "skill", "tool", "output", "run", "instance",
  "step", "input", "graph", "flow", "task", "blueprint",
];

function randomType(): Node["type"] {
  const r = Math.random();
  if (r < 0.3) return "agent";
  if (r < 0.65) return "skill";
  return "output";
}

export function GraceAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    let nodes: Node[] = [];
    let width = 0;
    let height = 0;
    let active = true;

    function resize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function spawnNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1.5,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        type: randomType(),
      }));
    }

    function nodeColor(n: Node): string {
      if (n.type === "agent") return AGENT_COLOR;
      if (n.type === "skill") return SKILL_COLOR;
      return OUTPUT_COLOR;
    }

    let tick = 0;

    function draw() {
      if (!ctx || !canvas || !active) return;
      tick++;

      ctx.clearRect(0, 0, width, height);

      // Faint radial gradient background glow
      const grad = ctx.createRadialGradient(
        width * 0.6, height * 0.4, 0,
        width * 0.6, height * 0.4, Math.max(width, height) * 0.7
      );
      grad.addColorStop(0, "rgba(109,40,217,0.06)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulsePhase += n.pulseSpeed;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]!;
          const b = nodes[j]!;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = `${LINE_COLOR}${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Animated data packet travelling along edge
            if (Math.sin(tick * 0.05 + i * 1.3 + j * 0.7) > 0.92) {
              const t = ((tick * 0.02 + i * 0.4) % 1 + 1) % 1;
              const px = a.x + (b.x - a.x) * t;
              const py = a.y + (b.y - a.y) * t;
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(216,180,254,0.9)`;
              ctx.fill();
            }
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const pulse = 0.6 + 0.4 * Math.sin(n.pulsePhase);
        const color = nodeColor(n);
        const r = n.radius * (n.type === "agent" ? 1.6 : 1);

        // Outer glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
        glow.addColorStop(0, `${color}${0.2 * pulse})`);
        glow.addColorStop(1, `${color}0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${0.7 + 0.3 * pulse})`;
        ctx.fill();

        // Bright center dot for agents
        if (n.type === "agent") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(237,233,254,${0.9 * pulse})`;
          ctx.fill();
        }
      }

      // Floating GRACE labels — subtle, large, fading
      ctx.save();
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "rgba(167,139,250,0.07)";
      ctx.letterSpacing = "0.15em";
      const labelCols = 4;
      const labelRows = 5;
      for (let row = 0; row < labelRows; row++) {
        for (let col = 0; col < labelCols; col++) {
          const word = LABEL_WORDS[(row * labelCols + col) % LABEL_WORDS.length]!;
          const x = (col / labelCols) * width + 20;
          const y = (row / labelRows) * height + 40;
          ctx.fillText(word.toUpperCase(), x, y);
        }
      }
      ctx.restore();

      // Large ghost "GRACE" watermark
      ctx.save();
      ctx.font = `bold ${Math.floor(width * 0.12)}px sans-serif`;
      ctx.fillStyle = "rgba(109,40,217,0.04)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GRACE", width / 2, height / 2);
      ctx.restore();

      frameRef.current = requestAnimationFrame(draw);
    }

    function start() {
      if (motionMedia.matches) return;
      resize();
      spawnNodes();
      draw();
    }

    const ro = new ResizeObserver(() => {
      resize();
      spawnNodes();
    });
    ro.observe(canvas);

    start();
    const onMotion = () => { if (motionMedia.matches && frameRef.current) cancelAnimationFrame(frameRef.current); };
    motionMedia.addEventListener("change", onMotion);

    return () => {
      active = false;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      motionMedia.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      aria-hidden="true"
      style={{ display: "block" }}
    />
  );
}
