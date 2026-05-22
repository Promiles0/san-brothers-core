// @refresh reset
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import rw from "@/messages/rw.json";
import type { Locale } from "@/lib/types";

type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = { en, zh, rw };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  tRaw: <T = unknown>(key: string) => T;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "sb-locale";

function resolveKey(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, k) => {
    if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, messages);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as Locale | null) ?? "en";
    setLocaleState(stored);
    document.documentElement.lang = stored;
  }, []);

  const setLocale = (l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000`;
    document.documentElement.lang = l;
    setLocaleState(l);
  };

  const t = (key: string): string => {
    const v = resolveKey(dictionaries[locale], key);
    return typeof v === "string" ? v : key;
  };
  const tRaw = <T,>(key: string): T => resolveKey(dictionaries[locale], key) as T;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, tRaw }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
