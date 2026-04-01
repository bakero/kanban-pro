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
    primary:  { background: "#7F77DD", color: "#fff", border: "none" },
    danger:   { background: "#fdecea", color: "#c0392b", border: "none" },
    outline:  { background: T.bg, color: T.textSoft, border: `1.5px solid ${T.border}` },
    ghost:    { background: "transparent", color: T.textSoft, border: "none" },
    filter:   { background: T.bgSoft, color: T.textSoft, border: `1.5px solid ${T.border}` },
    filterOn: { background: "#7F77DD18", color: "#7F77DD", border: "1.5px solid #7F77DD" },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: "7px 14px",
      borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, ...vars[variant], ...s,
    }}>
      {children}
    </button>
  );
}
