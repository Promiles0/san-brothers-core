import type { ReactNode } from "react";
import { ConsultancyNavbar } from "./consultancy-navbar";
import { TranslateFooter } from "./translate-footer";

export function ConsultancyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ConsultancyNavbar />
      <main className="flex-1">{children}</main>
      <TranslateFooter />
    </div>
  );
}
