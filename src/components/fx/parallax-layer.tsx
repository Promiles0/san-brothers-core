import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ParallaxLayerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** -1..1 — negative moves opposite to scroll, positive moves with it. */
  speed?: number;
}

/**
 * Scroll-linked translateY parallax. rAF throttled. Reduced-motion safe.
 */
export function ParallaxLayer({
  children,
  className,
  speed = -0.2,
  ...rest
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let queued = false;

    const update = () => {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${center * speed}px, 0)`;
      queued = false;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)} {...rest}>
      {children}
    </div>
  );
}
