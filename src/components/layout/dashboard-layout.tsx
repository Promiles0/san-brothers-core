import { useState, useMemo, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Menu, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortal, getParentLink } from "@/lib/portal-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Sidebar } from "@/components/layout/sidebar";
import type { UserRole } from "@/lib/types";
import { useI18n } from "@/lib/providers/i18n-provider";

interface DashboardLayoutProps {
  role: UserRole;
  children: ReactNode;
  breadcrumbs?: string[];
  /** Nav item keys to suppress in the sidebar */
  hiddenNavKeys?: string[];
}

export function DashboardLayout({
  role,
  children,
  breadcrumbs,
  hiddenNavKeys,
}: DashboardLayoutProps) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const computedCrumbs = useMemo<string[]>(() => {
    if (breadcrumbs) return breadcrumbs;
    const segs = location.pathname.split("/").filter(Boolean);
    // segs[0] = role section (dashboard/staff/admin), rest = pages
    const labels: Record<string, string> = {
      dashboard: role,
      staff: role,
      admin: role,
      messages: "Messages",
      payments: "Payments",
      documents: "Documents",
      claims: "Claims",
      profile: "Profile",
      settings: "Settings",
      "my-services": "My Services",
      services: "Services",
      interpreter: "Interpreter",
      new: "New",
      apply: "Apply",
      confirmation: "Confirmation",
    };
    const out: string[] = [];
    segs.forEach((s, i) => {
      if (i === 0) {
        out.push(role);
        return;
      }
      // skip params (uuid-like, or digits)
      if (/^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)) return;
      out.push(labels[s] ?? s.replace(/-/g, " "));
    });
    if (out.length === 1) out.push("Home");
    return out;
  }, [breadcrumbs, location.pathname, role]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/sanlogo-Photoroom.png" alt="San Brothers" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold text-sidebar-foreground">San Brothers</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar role={role} hiddenNavKeys={hiddenNavKeys} />
        </div>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle>San Brothers</SheetTitle>
              </SheetHeader>
              <Sidebar
                role={role}
                onNavigate={() => setMobileOpen(false)}
                hiddenNavKeys={hiddenNavKeys}
              />
            </SheetContent>
          </Sheet>

          {/* Breadcrumbs */}
          <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
            {computedCrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === computedCrumbs.length - 1 ? "text-foreground capitalize" : "capitalize"}>{b}</span>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <NotificationBell />
            <LanguageSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {role[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="capitalize">{role}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{t("common.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <PortalBanner />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function PortalBanner() {
  const { isChild, displayName } = usePortal();
  if (!isChild) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-2 text-sm md:px-6">
      <span className="font-medium">
        You're on: <span className="text-primary">{displayName}</span>
      </span>
      <a
        href={getParentLink()}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to San Brothers
      </a>
    </div>
  );
}
