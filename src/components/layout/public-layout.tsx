import type { ReactNode } from "react";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
