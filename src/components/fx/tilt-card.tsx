import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Max rotation in degrees on each axis. */
  max?: number;
  /** Show cursor-tracking spotlight overlay. */
  spotlight?: boolean;
}

/**
 * Mouse-tracked 3D tilt wrapper. Pure CSS transforms, no library.
 * Honors prefers-reduced-motion via the .fx-tilt class style block.
 */
export function TiltCard({
  children,
  className,
  max = 8,
  spotlight = true,
  ...rest
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rx = (0.5 - y) * max * 2;
    const ry = (x - 0.5) * max * 2;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("fx-tilt relative", spotlight && "fx-tilt-spotlight", className)}
      {...rest}
    >
      <div className="fx-tilt-inner">{children}</div>
    </div>
  );
}
