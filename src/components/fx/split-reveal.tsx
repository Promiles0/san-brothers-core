import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SplitRevealProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  /** Gap utility, e.g. "gap-8". */
  gapClass?: string;
}

/**
 * Two children slide in from opposite sides when the container enters view.
 */
export function SplitReveal({ left, right, className, gapClass = "gap-8" }: SplitRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("fx-split grid md:grid-cols-2", gapClass, className)}>
      <div className="fx-split-left">{left}</div>
      <div className="fx-split-right">{right}</div>
    </div>
  );
}
