import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Theme } from "@/lib/types";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_KEY = "theme";
const LEGACY_LS_KEY = "sb-theme";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function readInitialTheme(): Theme {
  const fromCookie = readCookie(COOKIE_KEY) as Theme | null;
  if (fromCookie === "light" || fromCookie === "dark" || fromCookie === "system") {
    return fromCookie;
  }
  if (typeof localStorage !== "undefined") {
    const legacy = localStorage.getItem(LEGACY_LS_KEY) as Theme | null;
    if (legacy === "light" || legacy === "dark" || legacy === "system") return legacy;
  }
  return "system";
}

function applyTheme(t: Theme): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const resolved: "light" | "dark" =
    t === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : t;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initial = readInitialTheme();
    setThemeState(initial);
    setResolved(applyTheme(initial));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (readCookie(COOKIE_KEY) as Theme | null) ?? "system";
      if (current === "system") setResolved(applyTheme("system"));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = (t: Theme) => {
    writeCookie(COOKIE_KEY, t);
    try {
      localStorage.setItem(LEGACY_LS_KEY, t);
    } catch {
      // ignore
    }
    setThemeState(t);
    setResolved(applyTheme(t));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Stub hook that will later sync theme preference to a backend user-preference store.
 * For now, it just proxies to the cookie-based ThemeProvider.
 */
export function useUserTheme() {
  return useTheme();
}
