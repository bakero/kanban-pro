import { createContext, useContext, useState, useEffect } from "react";

const DARK = {
  bg:        "#1c1c1e",
  bgSoft:    "#2c2c2e",
  bgCard:    "#242426",
  text:      "#f2f2f7",
  textSoft:  "#98989f",
  border:    "#3a3a3c",
  borderMed: "#48484a",
  iconBtn:   "#f2f2f7",
};

const LIGHT = {
  bg:        "#ffffff",
  bgSoft:    "#f4f4f5",
  bgCard:    "#ffffff",
  text:      "#1c1c1e",
  textSoft:  "#6b6b72",
  border:    "#d1d1d6",
  borderMed: "#bcbcc0",
  iconBtn:   "#1c1c1e",
};

export type Theme = typeof LIGHT;

export const ThemeContext = createContext<Theme>(LIGHT);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useSystemTheme(): Theme {
  const [isDark, setIsDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark ? DARK : LIGHT;
}
