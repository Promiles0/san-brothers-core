import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Re-keys its children on pathname change so a CSS mount animation
 * (fx-page-in) replays. CSS-only, no library, respects reduced motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return (
    <div key={key} className="fx-page-in">
      {children}
    </div>
  );
}
