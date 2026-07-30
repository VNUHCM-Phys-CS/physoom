"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { dictionaries } from "./dictionaries";

const I18nContext = createContext({ lang: "vi", setLang: () => {}, t: (k) => k });

const STORAGE_KEY = "physoom-lang";
const DEFAULT_LANG = "vi";

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  // Load persisted preference on mount (default: Vietnamese)
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "vi" || saved === "en") setLangState(saved);
    } catch { /* ignore */ }
  }, []);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  // t(key, vars?) — falls back to English, then to the key itself.
  // Supports simple {name} interpolation.
  const t = useCallback(
    (key, vars) => {
      const table = dictionaries[lang] || dictionaries.en;
      let str = table[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang: mounted ? lang : DEFAULT_LANG, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
