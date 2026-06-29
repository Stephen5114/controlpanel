import React, { createContext, useContext, useState, useEffect, useRef } from "react";

export const LANGUAGES: Record<string, { label: string; code: string }> = {
  EN: { label: "English", code: "en" },
  ZH: { label: "简体中文", code: "zh" },
  ES: { label: "Español", code: "es" },
  JA: { label: "日本語", code: "ja" },
};

type TranslationMap = Record<string, string>;

// Dynamic import loaders — each language becomes a separate Vite chunk.
const loaders: Record<string, () => Promise<{ default: TranslationMap }>> = {
  ZH: () => import("../i18n/zh.json"),
  ES: () => import("../i18n/es.json"),
  JA: () => import("../i18n/ja.json"),
};

// In-memory cache so switching back to a loaded language is instant.
const cache = new Map<string, TranslationMap>();

// ── Context ──────────────────────────────────────────────────────────────────
type LocalizationContextType = {
  currentLang: string;
  setLang: (lang: string) => void;
  t: (key: string, defaultValue: string) => string;
};

const LocalizationContext = createContext<LocalizationContextType | null>(null);

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used within a LocalizationProvider");
  }
  return context;
}

// ── Language detection (exported for pre-render fallback) ────────────────────
export function detectInitialLang(): string {
  const cookies = document.cookie.split(";").reduce((acc, cookie) => {
    const parts = cookie.trim().split("=");
    if (parts.length >= 2) {
      const name = parts[0];
      const value = parts.slice(1).join("=");
      acc[name] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  if (cookies["vibe-hosting-lang"]) {
    const code = cookies["vibe-hosting-lang"].toUpperCase();
    if (LANGUAGES[code]) return code;
  }

  const saved = localStorage.getItem("vibe-hosting-lang");
  if (saved && LANGUAGES[saved.toUpperCase()]) {
    return saved.toUpperCase();
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) return "ZH";
    if (browserLang.startsWith("es")) return "ES";
    if (browserLang.startsWith("ja")) return "JA";
  }

  return "EN";
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const initialLang = useRef<string | null>(null);
  if (initialLang.current === null) {
    initialLang.current = detectInitialLang();
  }

  const [currentLang, setCurrentLangState] = useState(initialLang.current);
  const [translations, setTranslations] = useState<TranslationMap>(
    () => cache.get(initialLang.current!) ?? {}
  );
  const setLangRef = useRef<((lang: string) => void) | null>(null);

  // ── Load translations for the current language ──
  useEffect(() => {
    let cancelled = false;

    if (currentLang === "EN") {
      setTranslations({});
      return;
    }

    const cached = cache.get(currentLang);
    if (cached) {
      setTranslations(cached);
      return;
    }

    const load = loaders[currentLang];
    if (!load) {
      setTranslations({});
      return;
    }

    load().then((mod) => {
      if (cancelled) return;
      cache.set(currentLang, mod.default);
      setTranslations(mod.default);
    });

    return () => { cancelled = true; };
  }, [currentLang]);

  // ── setLang ──
  const setLang = (lang: string) => {
    const upper = lang.toUpperCase();
    if (LANGUAGES[upper]) {
      setCurrentLangState(upper);
      localStorage.setItem("vibe-hosting-lang", upper);
      document.cookie = `vibe-hosting-lang=${upper.toLowerCase()}; path=/; max-age=604800; domain=.hostvibecoding.com; SameSite=Lax`;
      document.cookie = `vibe-hosting-lang=${upper.toLowerCase()}; path=/; max-age=604800; SameSite=Lax`;
    }
  };
  setLangRef.current = setLang;

  // ── t(key, defaultValue) ──
  const t = (key: string, defaultValue: string) => {
    if (!translations) return defaultValue;
    return translations[key] ?? defaultValue;
  };

  return (
    <LocalizationContext.Provider value={{ currentLang, setLang, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}
