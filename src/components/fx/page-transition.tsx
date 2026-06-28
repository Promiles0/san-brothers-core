import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

type Mode = "fade" | "slide" | "zoom" | "blur";

function pickMode(pathname: string): Mode {
  if (pathname === "/" || pathname === "") return "fade";
  if (pathname.startsWith("/services")) return "slide";
  if (pathname.startsWith("/pricing")) return "zoom";
  if (pathname.startsWith("/contact")) return "blur";
  if (pathname.startsWith("/about")) return "fade";
  if (pathname.startsWith("/faq")) return "fade";
  if (pathname.startsWith("/translate")) return "slide";
  if (pathname.startsWith("/consultancy")) return "zoom";
  return "fade";
}

/**
 * Re-keys its children on pathname change so a CSS mount animation
 * (variant-dependent) replays. CSS-only, no library, respects reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  const mode = pickMode(pathname);

  return (
    <div key={key} data-fx-mode={mode} className="fx-page-opacity">
      {children}
    </div>
  );
}
