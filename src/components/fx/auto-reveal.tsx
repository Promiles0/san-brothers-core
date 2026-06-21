import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global auto-reveal: walks the DOM after each route change and applies
 * scroll-driven reveal/stagger animations to every `<section>` and any
 * direct grid-children, without requiring per-page edits.
 *
 * Behaviour:
 *  - Each <section> inside <main> gets `fx-reveal` (variant fade-up).
 *  - Direct children of `.grid` (more than one child) are wrapped as a
 *    stagger group: the grid itself gets `fx-stagger`, kids get
 *    `fx-stagger-item` + `--i` index, animating one after the other.
 *  - Respects `prefers-reduced-motion`.
 *  - Skips elements already opted-in (`data-fx-skip`) or already tagged.
 */
export function AutoReveal() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Defer until route content has mounted into the DOM.
    const t = window.setTimeout(() => {
      const main = document.querySelector("main") ?? document.body;
      if (!main) return;

      const sections = Array.from(main.querySelectorAll<HTMLElement>("section"));
      const grids = Array.from(
        main.querySelectorAll<HTMLElement>(
          ".grid:not([data-fx-skip]):not(.fx-stagger)"
        )
      );

      // 1) Sections → fade-up reveal
      sections.forEach((el, idx) => {
        if (el.dataset.fxSkip || el.classList.contains("fx-reveal")) return;
        el.classList.add("fx-reveal");
        if (!el.getAttribute("data-variant")) {
          // Alternate variants for visual rhythm
          const variants = ["fade-up", "fade", "slide-left", "slide-right", "zoom"] as const;
          el.setAttribute("data-variant", variants[idx % variants.length]);
        }
      });

      // 2) Grids with >1 child → stagger group
      grids.forEach((grid) => {
        const children = Array.from(grid.children) as HTMLElement[];
        if (children.length < 2) return;
        grid.classList.add("fx-stagger");
        if (!grid.getAttribute("data-variant")) {
          grid.setAttribute("data-variant", "fade-up");
        }
        children.forEach((child, i) => {
          child.classList.add("fx-stagger-item");
          child.style.setProperty("--i", String(i));
          child.style.setProperty("--step", "90ms");
        });
      });

      if (reduced) {
        sections.forEach((el) => el.classList.add("is-visible"));
        grids.forEach((el) => el.classList.add("is-visible"));
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
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );

      sections.forEach((el) => io.observe(el));
      grids.forEach((el) => io.observe(el));

      // Cleanup observer when route changes
      observerRef.current = io;
    }, 60);

    return () => {
      window.clearTimeout(t);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [pathname]);

  return null;
}

const observerRef: { current: IntersectionObserver | null } = { current: null };
