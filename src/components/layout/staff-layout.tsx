import { useState, type ReactNode } from "react";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { StaffSidebar } from "@/components/layout/staff-sidebar";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export function StaffLayout({
  children,
  breadcrumbs = ["Staff", "Home"],
}: {
  children: ReactNode;
  breadcrumbs?: string[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminArea = pathname.startsWith("/staff/admin");
  const Sidebar = isAdminArea ? AdminSidebar : StaffSidebar;
  const sidebarLabel = isAdminArea ? "San Brothers — Admin" : "San Brothers — Staff";
  const sidebarBadge = isAdminArea ? "AD" : "SB";
  const initial = (profile?.full_name?.[0] ?? profile?.email?.[0] ?? "S").toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
            {sidebarBadge}
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">{sidebarLabel}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle>{isAdminArea ? "Admin" : "Staff"}</SheetTitle>
              </SheetHeader>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>{b}</span>
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="capitalize">
                  {profile?.full_name ?? profile?.role}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/staff/settings" })}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                  }}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
