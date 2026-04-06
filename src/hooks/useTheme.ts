import { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "system" | "light" | "dark";

export const LIGHT = {
  name: "light",
  bg: "#F4F6F8",
  bgSoft: "#EEF2F6",
  bgCard: "#FFFFFF",
  bgElevated: "#FBFCFE",
  bgSidebar: "rgba(255,255,255,0.82)",
  bgColumn: "#E9EDF2",
  text: "#1A1C1E",
  textSoft: "#656E7B",
  textMuted: "#8C96A5",
  border: "#DDE2E9",
  borderMed: "#C9D2DC",
  borderStrong: "#B7C2CF",
  iconBtn: "#1A1C1E",
  accent: "#3E7BFA",
  accentSoft: "#F0F4FF",
  success: "#27A376",
  successSoft: "#E8F6F0",
  warning: "#C98A2F",
  warningSoft: "#FFF3E3",
  danger: "#E65F5F",
  dangerSoft: "#FDECEC",
  shadowSm: "0 2px 8px rgba(26,28,30,0.05)",
  shadowMd: "0 18px 40px rgba(112,128,144,0.12)",
  shadowLg: "0 28px 70px rgba(112,128,144,0.2)",
  overlay: "rgba(26, 28, 30, 0.48)",
};

export const DARK = {
  name: "dark",
  bg: "#171819",
  bgSoft: "#111214",
  bgCard: "#222426",
  bgElevated: "#1C1E21",
  bgSidebar: "rgba(24,25,27,0.92)",
  bgColumn: "#181A1D",
  text: "#F2F4F7",
  textSoft: "#A3ACB9",
  textMuted: "#7A838F",
  border: "#2C3138",
  borderMed: "#39414A",
  borderStrong: "#4A5562",
  iconBtn: "#F2F4F7",
  accent: "#5B8CFA",
  accentSoft: "#22314D",
  success: "#8FBF9F",
  successSoft: "#1F322A",
  warning: "#D3A45A",
  warningSoft: "#3A2F1D",
  danger: "#E07A7A",
  dangerSoft: "#402326",
  shadowSm: "0 2px 10px rgba(0,0,0,0.18)",
  shadowMd: "0 18px 44px rgba(0,0,0,0.28)",
  shadowLg: "0 30px 80px rgba(0,0,0,0.45)",
  overlay: "rgba(0, 0, 0, 0.58)",
};

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
