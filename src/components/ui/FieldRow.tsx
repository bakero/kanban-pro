import React from "react";
import { FONT } from "../../constants";
import { useTheme } from "../../hooks/useTheme";

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.textSoft, width: 105, flexShrink: 0, fontFamily: FONT }}>
        {label}
      </span>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}
