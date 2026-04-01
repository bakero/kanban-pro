import { useState } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { uid, nameInitials, strColor } from "../lib/utils";
import { Btn } from "./ui/Btn";
import type { User } from "../types";

interface UserModalProps {
  onClose: () => void;
  onSave: (u: User) => void;
}

export function UserModal({ onClose, onSave }: UserModalProps) {
  const T = useTheme();
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [role,  setRole]  = useState<"MASTER" | "USER">("USER");
  const [err,   setErr]   = useState("");

  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 8,
    border: `1.5px solid ${T.border}`, padding: "9px 12px",
    width: "100%", boxSizing: "border-box",
    backgroundColor: T.bgSoft, color: T.text, outline: "none",
  };

  function submit() {
    if (!name.trim()) { setErr("Nombre obligatorio."); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Email inválido."); return; }
    onSave({ id: uid(), name: name.trim(), email: email.trim(), initials: nameInitials(name), color: strColor(email), role });
  }

  return (
    <div style={{
      position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700, padding: 20,
    }}>
      <div style={{
        backgroundColor: T.bg, borderRadius: 20, border: `2px solid ${T.borderMed}`,
        width: "100%", maxWidth: 380, padding: 22,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text }}>Nuevo usuario</span>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "2px 8px" }}>✕</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 4 }}>Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 7 }}>Rol</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["MASTER", "USER"] as const).map(r => (
                <div key={r} onClick={() => setRole(r)} style={{
                  flex: 1, padding: "9px 11px", borderRadius: 11,
                  border: `2px solid ${role === r ? "#7F77DD" : T.border}`,
                  backgroundColor: role === r ? "#7F77DD11" : T.bgSoft, cursor: "pointer",
                }}>
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, fontFamily: FONT, color: role === r ? "#7F77DD" : T.text }}>{r}</p>
                  <p style={{ margin: 0, fontSize: 11, fontFamily: FONT, color: T.textSoft }}>{r === "MASTER" ? "Configura todo" : "Crea y mueve"}</p>
                </div>
              ))}
            </div>
          </div>
          {err && <p style={{ margin: 0, fontSize: 12, color: "#c0392b", fontFamily: FONT }}>{err}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn variant="outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={submit} style={{ flex: 1 }}>Añadir</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
