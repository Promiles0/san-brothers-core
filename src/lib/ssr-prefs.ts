import { createIsomorphicFn } from "@tanstack/react-start";
import { readSsrPrefsServer, type SsrPrefs } from "./ssr-prefs.server";

export type { SsrPrefs };

export const readSsrPrefs = createIsomorphicFn()
  .server((): SsrPrefs => readSsrPrefsServer())
  .client((): SsrPrefs => {
    const read = (name: string): string | null => {
      if (typeof document === "undefined") return null;
      const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
      return m ? decodeURIComponent(m[1]) : null;
    };
    return {
      theme: ((read("theme") ?? "system") as SsrPrefs["theme"]),
      locale: read("sb-locale") ?? "en",
    };
  });
