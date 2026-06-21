import { Children, cloneElement, isValidElement, useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RevealVariant } from "./reveal";

interface StaggerGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Per-item delay in ms (default 80). */
  step?: number;
  /** Base offset in ms (default 0). */
  baseDelay?: number;
  variant?: RevealVariant;
  threshold?: number;
  once?: boolean;
}

/**
 * Wraps a list/grid of children — when the group enters the viewport,
 * each direct child animates in sequence via CSS custom property --i.
 */
export function StaggerGroup({
  children,
  step = 80,
  baseDelay = 0,
  variant = "fade-up",
  threshold = 0.12,
  once = true,
  className,
  ...rest
}: StaggerGroupProps) {
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
            if (once) io.unobserve(e.target);
          } else if (!once) {
            e.target.classList.remove("is-visible");
          }
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const items = Children.toArray(children).map((child, i) => {
    if (!isValidElement(child)) return child;
    const el = child as React.ReactElement<{ className?: string; style?: CSSProperties }>;
    const prevStyle = (el.props.style ?? {}) as CSSProperties;
    return cloneElement(el, {
      className: cn("fx-stagger-item", el.props.className),
      style: {
        ...prevStyle,
        ["--i" as never]: i,
        ["--step" as never]: `${step}ms`,
        ["--base" as never]: `${baseDelay}ms`,
      },
    });
  });

  return (
    <div ref={ref} data-variant={variant} className={cn("fx-stagger", className)} {...rest}>
      {items}
    </div>
  );
}
