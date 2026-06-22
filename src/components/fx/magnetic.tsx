import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Pull strength in pixels at the edge. */
  strength?: number;
}

/**
 * Wrap a button/link so it leans toward the cursor on hover.
 * Pure inline transforms; no library; reduced motion handled by CSS.
 */
export function Magnetic({ children, className, strength = 14 }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    el.style.transform = `translate3d(${(x / r.width) * strength}px, ${(y / r.height) * strength}px, 0)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "translate3d(0,0,0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn("fx-magnetic inline-block transition-transform duration-300 ease-out", className)}
    >
      {children}
    </div>
  );
}
