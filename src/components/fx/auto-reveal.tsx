import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global auto-reveal: walks the DOM after each route change and applies
 * scroll-driven reveal/stagger animations to sections, headings, paragraphs,
 * and grid children — without requiring per-page edits.
 *
 *  - Respects `data-fx` opt-in: any element with [data-fx="variant"] becomes a reveal.
 *  - Respects `data-fx-skip` to opt out.
 *  - Sections cycle through 5 variants for visual rhythm.
 *  - Re-triggers when scrolling back into view (for top-level reveals).
 *  - Stagger items animate once.
 *  - Reduced-motion safe.
 */
const VARIANTS = ["fade-up", "slide-left", "slide-right", "zoom", "blur-in"] as const;

export function AutoReveal() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const t = window.setTimeout(() => {
      const main = document.querySelector("main") ?? document.body;
      if (!main) return;

      // 1) Sections
      const sections = Array.from(main.querySelectorAll<HTMLElement>("section"));
      sections.forEach((el, idx) => {
        if (el.dataset.fxSkip) return;
        if (el.classList.contains("fx-reveal") || el.hasAttribute("data-fx")) return;
        el.classList.add("fx-reveal");
        el.setAttribute("data-variant", VARIANTS[idx % VARIANTS.length]);
      });

      // 2) Grids → stagger
      const grids = Array.from(
        main.querySelectorAll<HTMLElement>(
          ".grid:not([data-fx-skip]):not(.fx-stagger)"
        )
      );
      grids.forEach((grid, gi) => {
        const children = Array.from(grid.children) as HTMLElement[];
        if (children.length < 2) return;
        grid.classList.add("fx-stagger");
        const variant = grid.getAttribute("data-variant")
          ?? (["fade-up", "zoom", "blur-in", "slide-left"][gi % 4] as string);
        grid.setAttribute("data-variant", variant);
        children.forEach((child, i) => {
          child.classList.add("fx-stagger-item");
          child.style.setProperty("--i", String(i));
          child.style.setProperty("--step", "140ms");
          child.style.setProperty("--base", "80ms");
        });
      });

      // 3) data-fx opt-ins (not yet observed)
      const optIns = Array.from(
        main.querySelectorAll<HTMLElement>("[data-fx]:not(.is-visible)")
      );

      // Collect all observable elements
      const reveals = [
        ...sections.filter((el) => el.classList.contains("fx-reveal")),
        ...optIns,
      ];
      const staggers = grids.filter((el) => el.classList.contains("fx-stagger"));

      if (reduced) {
        reveals.forEach((el) => el.classList.add("is-visible"));
        staggers.forEach((el) => el.classList.add("is-visible"));
        return;
      }

      // Reveals re-trigger (toggle visibility)
      const revealIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
            } else if ((e.target as HTMLElement).dataset.fxOnce !== "true") {
              // Only remove if out of view AND well past viewport (avoid flicker)
              if (e.boundingClientRect.top > window.innerHeight) {
                e.target.classList.remove("is-visible");
              }
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
      );
      reveals.forEach((el) => revealIO.observe(el));

      // Staggers only fire once (avoid flicker on many items)
      const staggerIO = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              staggerIO.unobserve(e.target);
            }
          }
        },
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );
      staggers.forEach((el) => staggerIO.observe(el));

      observerRef.current = { a: revealIO, b: staggerIO };
    }, 80);

    return () => {
      window.clearTimeout(t);
      observerRef.current?.a.disconnect();
      observerRef.current?.b.disconnect();
      observerRef.current = null;
    };
  }, [pathname]);

  return null;
}

const observerRef: {
  current: { a: IntersectionObserver; b: IntersectionObserver } | null;
} = { current: null };
