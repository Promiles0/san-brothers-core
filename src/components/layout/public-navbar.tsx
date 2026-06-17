import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/user-menu";

export function PublicNavbar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    { href: "/about", label: t("nav.about") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/faq", label: t("nav.faq") },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="glass-nav sticky top-0 z-50 w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <img
            src="/sanlogo-Photoroom.png"
            alt="San Brothers"
            className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]"
          />
          <span className="hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-sm font-semibold text-transparent sm:inline">
            San Brothers
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-active={isActive(l.href)}
              className="nav-link rounded-md px-3 py-2 text-sm font-medium"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <span className="icon-spin-hover inline-flex"><LanguageSwitcher /></span>
          <span className="icon-spin-hover inline-flex"><ThemeToggle /></span>
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href="/login">{t("common.login")}</a>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <a href="/signup">{t("common.signup")}</a>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <span className="icon-spin-hover inline-flex"><ThemeToggle /></span>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass-card w-80 border-l border-border/60">
              <SheetHeader>
                <SheetTitle className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  San Brothers
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">
                {links.map((l, i) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    data-active={isActive(l.href)}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className="animate-slide-down rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/10 hover:text-foreground hover:translate-x-1 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
                <div className="mt-3 flex items-center gap-2 px-3">
                  <LanguageSwitcher />
                </div>
                <div className="mt-3 flex flex-col gap-2 px-3">
                  {user ? (
                    <Button asChild>
                      <a href="/dashboard">{t("nav.dashboard")}</a>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <a href="/login">{t("common.login")}</a>
                      </Button>
                      <Button asChild className="bg-gradient-to-r from-primary to-primary/80">
                        <a href="/signup">{t("common.signup")}</a>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
