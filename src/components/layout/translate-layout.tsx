import type { ReactNode } from "react";
import { TranslateNavbar } from "./translate-navbar";
import { TranslateFooter } from "./translate-footer";

export function TranslateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TranslateNavbar />
      <main className="flex-1">{children}</main>
      <TranslateFooter />
    </div>
  );
}
