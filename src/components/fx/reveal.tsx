import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant =
  | "fade-up"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "blur-in";

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number; // ms
  duration?: number; // ms
  once?: boolean;
  threshold?: number;
  as?: "div" | "section" | "article" | "header" | "footer" | "ul" | "li";
}

/**
 * IntersectionObserver-driven reveal. CSS-only animation, SSR safe,
 * reduced-motion safe. Adds .is-visible when in viewport.
 */
export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration,
  once = true,
  threshold = 0.15,
  className,
  style,
  as: Tag = "div",
  ...rest
}: RevealProps) {
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
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  const Comp = Tag as never;
  return (
    <Comp
      ref={ref as never}
      data-variant={variant}
      className={cn("fx-reveal", className)}
      style={{
        ...(delay ? { animationDelay: `${delay}ms` } : null),
        ...(duration ? { animationDuration: `${duration}ms` } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
