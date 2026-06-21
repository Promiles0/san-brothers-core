import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RotatingTextProps {
  words: string[];
  intervalMs?: number;
  className?: string;
}

/**
 * Cycles through a list of words with a slide-up + blur swap effect.
 * Reduced-motion: shows the first word only.
 */
export function RotatingText({ words, intervalMs = 2400, className }: RotatingTextProps) {
  const safe = words && words.length > 0 ? words : [""];
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);

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
    const id = window.setInterval(() => {
      setI((p) => (p + 1) % safe.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reduced, safe.length, intervalMs]);

  if (reduced) {
    return <span className={cn("fx-rotating-text", className)}>{safe[0]}</span>;
  }

  return (
    <span className={cn("fx-rotating-text", className)} aria-live="polite">
      <span key={i} className="fx-rotating-text-word">
        {safe[i]}
      </span>
    </span>
  );
}
