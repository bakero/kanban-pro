import { createContext, useContext } from "react";
import es from "./es";
import en from "./en";

export type Lang = "es" | "en";
export const translations = { es, en } as const;
export type TranslationKey = keyof typeof es;

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const LangContext = createContext<LangContextValue>({
  lang: "es",
  setLang: () => {},
});

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return Object.keys(params).reduce(
    (acc, key) => acc.replaceAll(`{${key}}`, String(params[key])),
    template,
  );
}

export function translate(key: TranslationKey, lang: Lang, params?: Record<string, string | number>) {
  const fallback = translations.es[key] || key;
  const template = translations[lang][key] || fallback;
  return interpolate(template, params);
}

export function tr(entry: { es: string; en: string }, lang: Lang) {
  return entry[lang] || entry.es;
}

export function useLang() {
  const ctx = useContext(LangContext);
  return {
    lang: ctx.lang,
    setLang: ctx.setLang,
    t: (key: TranslationKey, params?: Record<string, string | number>) => translate(key, ctx.lang, params),
    tr: (entry: { es: string; en: string }) => tr(entry, ctx.lang),
  };
}
