import { useEffect, useRef } from "react";

/**
 * Fixed top scroll-progress bar (gradient primary→accent).
 * Uses rAF throttling and respects prefers-reduced-motion (still shown,
 * but instant — no easing).
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    let queued = false;

    const update = () => {
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      const p = scrollable > 0 ? (h.scrollTop / scrollable) * 100 : 0;
      bar.style.transform = `scaleX(${p / 100})`;
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
  }, []);

  return <div ref={barRef} aria-hidden className="fx-scroll-progress" />;
}
