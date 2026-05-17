import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/user-menu";

export function PublicNavbar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    { href: "/about", label: t("nav.about") },
    { href: "/pricing", label: t("nav.pricing") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/faq", label: t("nav.faq") },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary font-bold text-primary-foreground">SB</div>
          <span className="hidden text-sm font-semibold sm:inline">San Brothers</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><a href="/login">{t("common.login")}</a></Button>
              <Button size="sm" asChild><a href="/signup">{t("common.signup")}</a></Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle>San Brothers</SheetTitle></SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {links.map((l) => (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent/10">
                    {l.label}
                  </a>
                ))}
                <div className="mt-2 flex items-center gap-2 px-3"><LanguageSwitcher /></div>
                <div className="mt-2 flex flex-col gap-2 px-3">
                  {user ? (
                    <Button asChild><a href="/dashboard">{t("nav.dashboard")}</a></Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild><a href="/login">{t("common.login")}</a></Button>
                      <Button asChild><a href="/signup">{t("common.signup")}</a></Button>
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
