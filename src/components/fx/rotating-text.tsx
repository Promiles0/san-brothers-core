import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RotatingTextProps {
  words: string[];
  /** Visible time per word before swapping (ms). */
  intervalMs?: number;
  /** Exit animation duration (ms). */
  exitMs?: number;
  /** Per-letter stagger (ms). */
  staggerMs?: number;
  className?: string;
}

/**
 * Cycles through words with a per-letter swap: outgoing letters
 * slide up + blur out one by one, then incoming letters slide up + un-blur in.
 * Reduced-motion: shows the first word only.
 */
export function RotatingText({
  words,
  intervalMs = 2600,
  exitMs = 450,
  staggerMs = 28,
  className,
}: RotatingTextProps) {
  const safe = words && words.length > 0 ? words : [""];
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
    const tick = () => {
      setPhase("out");
      window.setTimeout(() => {
        setI((p) => (p + 1) % safe.length);
        setPhase("in");
      }, exitMs + staggerMs * Math.max(0, safe[i].length - 1));
    };
    timer.current = window.setTimeout(tick, intervalMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [i, phase, reduced, safe, intervalMs, exitMs, staggerMs]);

  if (reduced) {
    return <span className={cn("fx-rotating-text", className)}>{safe[0]}</span>;
  }

  const word = safe[i];
  const letters = Array.from(word);

  return (
    <span
      className={cn("fx-rotating-text", className)}
      aria-live="polite"
      aria-label={word}
    >
      {/* Reserve width to prevent layout jump */}
      <span className="fx-rotating-measure" aria-hidden="true">
        {safe.reduce((a, b) => (a.length >= b.length ? a : b))}
      </span>
      <span className="fx-rotating-stage" key={`${i}-${phase}`}>
        {letters.map((ch, idx) => (
          <span
            key={idx}
            className={
              phase === "in" ? "fx-rot-letter-in" : "fx-rot-letter-out"
            }
            style={{
              animationDelay: `${idx * staggerMs}ms`,
              animationDuration: phase === "in" ? "560ms" : `${exitMs}ms`,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </span>
    </span>
  );
}
