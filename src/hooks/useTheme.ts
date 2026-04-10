import { createContext, useContext, useEffect, useState } from "react";
import { THEME_DARK, THEME_LIGHT } from "../theme/tokens";

export type ThemeMode = "system" | "light" | "dark";

export const LIGHT = THEME_LIGHT;
export const DARK = THEME_DARK;

export type Theme = typeof LIGHT;

export const ThemeContext = createContext<Theme>(LIGHT);

export const ThemeModeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}>({
  mode: "system",
  setMode: () => undefined,
});

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function usePrefersDark() {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark;
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): Theme {
  if (mode === "dark") return DARK;
  if (mode === "light") return LIGHT;
  return prefersDark ? DARK : LIGHT;
}
