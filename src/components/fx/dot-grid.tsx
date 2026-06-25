import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DotGridProps {
  className?: string;
  /** Spacing between dots in CSS px. */
  spacing?: number;
  /** Base dot radius in CSS px. */
  dotSize?: number;
  /** Cursor influence radius in CSS px. */
  radius?: number;
  /** Max displacement of a dot toward/away from the cursor in CSS px. */
  strength?: number;
  /** Whether dots push away (true) or attract (false). */
  repel?: boolean;
  /** Dot color (any CSS color). */
  color?: string;
}

/**
 * Canvas warped dot-grid. Cursor displaces nearby dots with a smooth falloff.
 * One canvas, devicePixelRatio-aware, rAF-throttled, GPU-composited.
 * Honors prefers-reduced-motion (renders static grid only).
 */
export function DotGrid({
  className,
  spacing = 26,
  dotSize = 1.4,
  radius = 160,
  strength = 14,
  repel = false,
  color = "currentColor",
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0,
      height = 0;
    let dots: { x: number; y: number }[] = [];
    let mx = -9999,
      my = -9999;
    let raf = 0;
    let needsDraw = true;

    const resolvedColor = (() => {
      // Resolve `currentColor` once for canvas (canvas does not support it directly).
      if (color !== "currentColor") return color;
      const probe = getComputedStyle(parent).color;
      return probe || "rgba(120,120,140,0.7)";
    })();

    function rebuild() {
      const rect = parent!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;
      const offX = ((width - (cols - 1) * spacing) / 2) | 0;
      const offY = ((height - (rows - 1) * spacing) / 2) | 0;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({ x: offX + i * spacing, y: offY + j * spacing });
        }
      }
      needsDraw = true;
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const r2 = radius * radius;
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        let x = d.x,
          y = d.y;
        let r = dotSize;
        if (!reduce) {
          const dx = d.x - mx;
          const dy = d.y - my;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < r2) {
            const dist = Math.sqrt(dist2) || 1;
            const falloff = 1 - dist / radius;
            const push = strength * falloff * falloff;
            const sign = repel ? 1 : -1;
            x += (dx / dist) * push * sign;
            y += (dy / dist) * push * sign;
            r = dotSize + falloff * 1.4;
            ctx!.globalAlpha = 0.35 + falloff * 0.55;
          } else {
            ctx!.globalAlpha = 0.32;
          }
        } else {
          ctx!.globalAlpha = 0.3;
        }
        ctx!.fillStyle = resolvedColor;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = 0;
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    const onMove = (e: MouseEvent) => {
      const r = parent!.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      schedule();
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
      schedule();
    };

    const ro = new ResizeObserver(() => {
      rebuild();
      schedule();
    });
    ro.observe(parent);

    rebuild();
    schedule();

    if (!reduce) {
      parent.addEventListener("mousemove", onMove, { passive: true });
      parent.addEventListener("mouseleave", onLeave, { passive: true });
    }

    return () => {
      ro.disconnect();
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      void needsDraw;
    };
  }, [spacing, dotSize, radius, strength, repel, color]);

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
