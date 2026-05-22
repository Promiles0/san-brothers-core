import { getCookie } from "@tanstack/react-start/server";

export type SsrPrefs = { theme: "light" | "dark" | "system"; locale: string };

export function readSsrPrefsServer(): SsrPrefs {
  return {
    theme: (getCookie("theme") ?? "system") as SsrPrefs["theme"],
    locale: getCookie("sb-locale") ?? "en",
  };
}
