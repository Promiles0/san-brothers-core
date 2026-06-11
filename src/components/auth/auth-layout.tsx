import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-linear-to-br from-background via-background to-primary/10">
      <header className="flex items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/sanlogo-Photoroom.png" alt="San Brothers" className="h-9 w-9 object-contain" />
          <span className="text-sm font-semibold">San Brothers</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-110">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            {children}
          </div>
          {footer ? (
            <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-muted", "bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i <= score ? colors[score] : "bg-muted"}`}
          />
        ))}
      </div>
      {password ? <p className="text-xs text-muted-foreground">{labels[score]}</p> : null}
    </div>
  );
}

function scorePassword(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}
