import { createIsomorphicFn } from "@tanstack/react-start";

export type SsrPrefs = { theme: "light" | "dark" | "system"; locale: string };

export const readSsrPrefs = createIsomorphicFn()
  .server((): SsrPrefs => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCookie } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
    return {
      theme: ((getCookie("theme") ?? "system") as SsrPrefs["theme"]),
      locale: getCookie("sb-locale") ?? "en",
    };
  })
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
