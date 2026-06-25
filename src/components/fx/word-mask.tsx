import { useEffect, useRef } from "react";

interface WordMaskProps {
  text: string;
  /** Re-runs the reveal animation when this key changes (e.g. when a rotating phrase swaps). */
  resetKey?: string | number;
  /** Per-word stagger in ms. */
  stagger?: number;
  className?: string;
}

/**
 * Splits `text` into words and reveals each one with a clip-mask + translateY rise.
 * Pure CSS animation; restarts whenever `resetKey` changes.
 * Honors prefers-reduced-motion via styles.css overrides on .fx-word-mask.
 */
export function WordMask({ text, resetKey, stagger = 60, className }: WordMaskProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Restart animation by toggling a data attribute (forces reflow).
    el.classList.remove("is-in");
    void el.offsetWidth;
    el.classList.add("is-in");
  }, [resetKey, text]);

  const words = text.split(/(\s+)/);

  return (
    <span ref={ref} className={`fx-word-mask ${className ?? ""}`}>
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
        return (
          <span key={i} className="fx-word-mask-clip">
            <span
              className="fx-word-mask-word"
              style={{ animationDelay: `${i * (stagger / 2)}ms` }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </span>
  );
}
