import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RotatingTextProps {
  /** Full phrases to cycle through. Each can wrap naturally. */
  phrases: string[];
  /** Visible time per phrase (ms). */
  intervalMs?: number;
  /** Per-word stagger (ms). */
  staggerMs?: number;
  /** Out animation duration (ms). */
  exitMs?: number;
  className?: string;
}

/**
 * Cycles through full phrases. Words slide-up + blur out, next phrase's words
 * slide-up + blur in with a stagger. Reserves space for the largest phrase
 * to avoid layout jumps, and supports natural line wrapping.
 */
export function RotatingText({
  phrases,
  intervalMs = 3200,
  staggerMs = 55,
  exitMs = 520,
  className,
}: RotatingTextProps) {
  const safe = phrases && phrases.length > 0 ? phrases : [""];
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced || safe.length < 2) return;
    const wordCount = safe[i].trim().split(/\s+/).length;
    const tick = () => {
      setPhase("out");
      window.setTimeout(() => {
        setI((p) => (p + 1) % safe.length);
        setPhase("in");
      }, exitMs + staggerMs * Math.max(0, wordCount - 1));
    };
    timer.current = window.setTimeout(tick, intervalMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [i, phase, reduced, safe, intervalMs, exitMs, staggerMs]);

  if (reduced) {
    return <span className={cn("fx-rotating block", className)}>{safe[0]}</span>;
  }

  const current = safe[i];
  const words = current.split(/(\s+)/); // keep whitespace tokens

  return (
    <span
      className={cn("fx-rotating", className)}
      aria-live="polite"
      aria-label={current}
    >
      {/* Measure stack — reserves space for the tallest phrase */}
      <span className="fx-rotating-measure-stack" aria-hidden="true">
        {safe.map((p, idx) => (
          <span key={idx} className="fx-rotating-measure-row">
            {p}
          </span>
        ))}
      </span>

      {/* Animated phrase */}
      <span className="fx-rotating-active" key={`${i}-${phase}`}>
        {words.map((w, idx) => {
          if (/^\s+$/.test(w)) return <span key={idx}>{w}</span>;
          const wordIndex = words.slice(0, idx).filter((x) => !/^\s+$/.test(x)).length;
          return (
            <span
              key={idx}
              className={
                phase === "in" ? "fx-rot-word-in" : "fx-rot-word-out"
              }
              style={{
                animationDelay: `${wordIndex * staggerMs}ms`,
                animationDuration: phase === "in" ? "640ms" : `${exitMs}ms`,
              }}
            >
              {w}
            </span>
          );
        })}
      </span>
    </span>
  );
}
