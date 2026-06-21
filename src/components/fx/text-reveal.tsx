import { useEffect, useRef, type ElementType } from "react";
import { cn } from "@/lib/utils";

interface TextRevealProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** Per-word delay in ms (default 55). */
  step?: number;
  delay?: number;
}

/**
 * Splits text into words and reveals each with a mask + slide-up.
 * Reduced-motion safe (renders plain text).
 */
export function TextReveal({
  text,
  as: Tag = "h1",
  className,
  step = 55,
  delay = 0,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);

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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = text.split(/(\s+)/);

  const Comp = Tag as unknown as React.ElementType;
  return (
    <Comp ref={ref} className={cn("fx-text-reveal", className)}>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <span key={i}> </span>
        ) : (
          <span key={i} className="fx-text-word">
            <span
              className="fx-text-word-inner"
              style={{ animationDelay: `${delay + i * step}ms` }}
            >
              {w}
            </span>
          </span>
        )
      )}
    </Comp>
  );
}
