import type { ReactNode } from "react";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex-1 pt-20">{children}</main>
        <PublicFooter />
      </div>
    </>
  );
}
