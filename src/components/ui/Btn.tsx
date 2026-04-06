import React from "react";
import { FONT } from "../../constants";
import { useTheme } from "../../hooks/useTheme";

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "outline" | "ghost" | "filter" | "filterOn";
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function Btn({ children, onClick, variant = "outline", style: s = {}, disabled = false }: BtnProps) {
  const T = useTheme();
  const vars: Record<string, React.CSSProperties> = {
    primary:  { background: T.accent, color: "#fff", border: "none", boxShadow: T.shadowSm },
    danger:   { background: T.dangerSoft, color: T.danger, border: "none" },
    outline:  { background: T.bgElevated, color: T.textSoft, border: `1px solid ${T.border}` },
    ghost:    { background: "transparent", color: T.textSoft, border: "none" },
    filter:   { background: T.bgElevated, color: T.textSoft, border: `1px solid ${T.border}` },
    filterOn: { background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}` },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: "7px 14px",
      borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, ...vars[variant], ...s,
    }}>
      {children}
    </button>
  );
}
