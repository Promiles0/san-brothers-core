import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CursorSpotlightProps {
  className?: string;
  /** Radius of the light spot in px. */
  size?: number;
  /** Spotlight color (CSS color). Defaults to brand primary mix. */
  color?: string;
  /** Mix mode — "screen" for dark themes, "multiply"/"overlay" can also work. */
  blend?: "screen" | "overlay" | "soft-light";
  /** Whether to listen on window (true) or parent element (false). */
  global?: boolean;
}

/**
 * A soft radial light that follows the cursor. Writes to CSS vars via rAF — no React state.
 * Place inside a `position: relative` parent. Pointer-events disabled.
 */
export function CursorSpotlight({
  className,
  size = 380,
  color = "color-mix(in oklab, var(--primary) 60%, transparent)",
  blend = "screen",
  global = false,
}: CursorSpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target: HTMLElement | Window = global ? window : (el.parentElement ?? window);
    let raf = 0;
    let nx = 0,
      ny = 0;
    const apply = () => {
      el.style.setProperty("--mx", `${nx}px`);
      el.style.setProperty("--my", `${ny}px`);
      raf = 0;
    };
    const onMove = (e: Event) => {
      const me = e as MouseEvent;
      if (global) {
        nx = me.clientX;
        ny = me.clientY;
      } else {
        const r = (target as HTMLElement).getBoundingClientRect();
        nx = me.clientX - r.left;
        ny = me.clientY - r.top;
      }
      if (!raf) raf = requestAnimationFrame(apply);
    };
    target.addEventListener("mousemove", onMove as EventListener, { passive: true } as never);
    return () => {
      target.removeEventListener("mousemove", onMove as EventListener);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [global]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("fx-cursor-spot pointer-events-none absolute inset-0", className)}
      style={{
        ["--spot-size" as string]: `${size}px`,
        ["--spot-color" as string]: color,
        mixBlendMode: blend,
      }}
    />
  );
}
