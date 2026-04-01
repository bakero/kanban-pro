import { useState } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { Btn } from "./ui/Btn";

interface JustifyModalProps {
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function JustifyModal({ title, onConfirm, onCancel }: JustifyModalProps) {
  const T = useTheme();
  const [reason, setReason] = useState("");

  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 8,
    border: `1.5px solid ${T.border}`, padding: "8px 10px",
    width: "100%", boxSizing: "border-box",
    backgroundColor: T.bgSoft, color: T.text, outline: "none", resize: "vertical",
  };

  return (
    <div style={{
      position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 800, padding: 20,
    }}>
      <div style={{
        backgroundColor: T.bg, borderRadius: 20, border: "2px solid #E24B4A",
        width: "100%", maxWidth: 420, padding: 24,
      }}>
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, fontFamily: FONT, color: "#c0392b" }}>
          ⚠ {title}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 13, fontFamily: FONT, color: T.textSoft }}>
          Es obligatorio indicar el motivo:
        </p>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          rows={4} placeholder="Escribe la justificación..." style={inp} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn variant="outline" onClick={onCancel} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => reason.trim() && onConfirm(reason)}
            disabled={!reason.trim()} style={{ flex: 1 }}>Confirmar</Btn>
        </div>
      </div>
    </div>
  );
}
