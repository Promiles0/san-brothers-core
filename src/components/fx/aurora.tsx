import { cn } from "@/lib/utils";

interface AuroraProps {
  className?: string;
  /** Tone: primary-leaning or accent-leaning gradient mix. */
  tone?: "primary" | "accent" | "mixed";
  /** Overall layer opacity (0–1). */
  opacity?: number;
}

/**
 * Pure-CSS drifting aurora background. Two slow gradient layers, brand-tinted.
 * Zero JS, GPU-composited. Disabled under prefers-reduced-motion.
 */
export function Aurora({ className, tone = "mixed", opacity = 0.35 }: AuroraProps) {
  return (
    <div
      aria-hidden
      className={cn("fx-aurora pointer-events-none absolute inset-0 overflow-hidden", className)}
      data-tone={tone}
      style={{ ["--fx-aurora-opacity" as string]: String(opacity) }}
    >
      <div className="fx-aurora-layer fx-aurora-a" />
      <div className="fx-aurora-layer fx-aurora-b" />
    </div>
  );
}
