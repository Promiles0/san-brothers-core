import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

interface AuthLayoutEnhancedProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Enhanced AuthLayout with modern UI/UX improvements:
 * - Gradient background with abstract depth
 * - Centered card with rounded corners and shadow
 * - Smooth animations and transitions
 * - Responsive design with mobile optimization
 */
export function AuthLayoutEnhanced({ title, subtitle, children, footer }: AuthLayoutEnhancedProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 animate-gradient-shift" />
        {/* Abstract decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Header with logo and controls */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-6 md:py-6">
        <Link
          to="/"
          className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
        >
          <img
            src="/sanlogo-Photoroom.png"
            alt="San Brothers"
            className="h-9 w-9 object-contain"
          />
          <span className="text-sm font-semibold text-foreground">San Brothers</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Card container with enhanced styling */}
          <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-sm p-6 md:p-8 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-border">
            {/* Title section */}
            <div className="mb-8 text-center animate-slide-down">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm md:text-base text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>

            {/* Form content */}
            <div className="animate-slide-up">{children}</div>
          </div>

          {/* Footer text */}
          {footer ? (
            <div className="mt-6 text-center text-sm text-muted-foreground animate-fade-in-delay">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

/**
 * Password strength indicator component with visual feedback
 */
export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-muted",
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
  ];

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      {password ? (
        <p className={`text-xs font-medium ${
          score <= 1
            ? "text-destructive"
            : score === 2
              ? "text-orange-500"
              : score === 3
                ? "text-yellow-500"
                : "text-green-500"
        }`}>
          {labels[score]} password
        </p>
      ) : null}
    </div>
  );
}

/**
 * Score password strength based on criteria
 */
function scorePassword(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4) as 0 | 1 | 2 | 3 | 4;
}
