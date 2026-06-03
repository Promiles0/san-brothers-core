import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, ArrowLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/user-menu";
import { getParentLink } from "@/lib/portal-context";

export function ConsultancyNavbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/consultancy", label: "Home" },
    { href: "/consultancy/how-it-works", label: "How it works" },
    { href: "/consultancy/pricing", label: "Pricing" },
    { href: "/consultancy/about", label: "About" },
  ];

  return (
    <>
      <div className="w-full border-b border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-1.5 md:px-6">
          <a
            href={getParentLink()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to San Brothers
          </a>
        </div>
      </div>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/consultancy" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:inline">
              Business Consultancy
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className="rounded-md border border-border">
              <LanguageSwitcher />
            </div>
            <ThemeToggle />
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/login?portal=consultancy">Log in</a>
                </Button>
                <Button size="sm" asChild>
                  <a href="/signup?portal=consultancy">Get started</a>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Business Consultancy</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  {links.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="rounded-md px-3 py-2 text-sm hover:bg-accent/10"
                    >
                      {l.label}
                    </a>
                  ))}
                  <div className="mt-2 px-3"><LanguageSwitcher /></div>
                  <div className="mt-2 flex flex-col gap-2 px-3">
                    {user ? <UserMenu /> : (
                      <>
                        <Button variant="outline" asChild><a href="/login?portal=consultancy">Log in</a></Button>
                        <Button asChild><a href="/signup?portal=consultancy">Get started</a></Button>
                      </>
                    )}
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
