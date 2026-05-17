import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/user-menu";

export function TranslateNavbar() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/translate", label: t("translate.nav.home") },
    { href: "/translate/how-it-works", label: t("translate.nav.howItWorks") },
    { href: "/translate/languages", label: t("translate.nav.languages") },
    { href: "/translate/pricing", label: t("translate.nav.pricing") },
  ];

  const flagMap: Record<string, string> = { en: "🇬🇧 EN", zh: "🇨🇳 中文", rw: "🇷🇼 RW" };

  return (
    <>
      <div className="w-full border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-1.5 md:px-6">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("translate.nav.backToCorporate")}
          </a>
        </div>
      </div>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/translate" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary font-bold text-primary-foreground">SB</div>
            <span className="hidden text-sm font-semibold italic tracking-tight text-foreground sm:inline">
              {t("translate.brand.wordmark")}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className="rounded-md border border-border">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <a href="/login">{t("common.login")}</a>
            </Button>
            <Button size="sm" className="gap-2" asChild>
              <a href="/signup?intent=live-interpreter">
                <Phone className="h-4 w-4" />
                {t("translate.nav.getHelpNow")}
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader><SheetTitle>{t("translate.brand.wordmark")}</SheetTitle></SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  {links.map((l) => (
                    <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent/10">
                      {l.label}
                    </a>
                  ))}
                  <div className="mt-2 flex items-center gap-2 px-3">
                    <span className="text-xs text-muted-foreground">{flagMap[locale]}</span>
                    <LanguageSwitcher />
                  </div>
                  <div className="mt-2 flex flex-col gap-2 px-3">
                    <Button variant="outline" asChild><a href="/login">{t("common.login")}</a></Button>
                    <Button asChild><a href="/signup?intent=live-interpreter">{t("translate.nav.getHelpNow")}</a></Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
