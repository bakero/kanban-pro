import { useState } from "react";
import { createPortal } from "react-dom";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { saveImprovement } from "../lib/db";
import { uid } from "../lib/utils";
import { Btn } from "./ui/Btn";
import type { Improvement } from "../types";

interface ImprovementModalProps {
  companyId: string;
  boardId: string;
  userId: string;
  userName: string;
  context: string;
  onClose: () => void;
}

export function ImprovementModal({ companyId, boardId, userId, userName, context, onClose }: ImprovementModalProps) {
  const T = useTheme();
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    if (!description.trim()) return;
    setSaving(true);
    const imp: Improvement = {
      id: uid(),
      company_id: companyId,
      board_id: boardId,
      user_id: userId,
      user_name: userName,
      description: description.trim(),
      context,
      status: "pending",
      created_at: new Date().toISOString(),
      applied_at: null,
      ai_result: null,
    };
    await saveImprovement(imp);
    setSaved(true);
    setSaving(false);
    setTimeout(onClose, 1200);
  }

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1200, padding: 20,
    }}>
      <div style={{
        backgroundColor: T.bg, borderRadius: 18, border: `2px solid ${T.borderMed}`,
        width: "100%", maxWidth: 400, padding: 22,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text, flex: 1 }}>
            Proponer mejora
          </span>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "2px 8px" }}>✕</Btn>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, margin: "0 0 4px" }}>
          Describe el problema o mejora que has encontrado
        </p>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ej: Los filtros no persisten al recargar la página..."
          rows={4}
          style={{
            fontFamily: FONT, fontSize: 13, borderRadius: 9,
            border: `1.5px solid ${T.border}`, padding: "9px 12px",
            width: "100%", boxSizing: "border-box", resize: "vertical",
            backgroundColor: T.bgSoft, color: T.text, outline: "none",
          }}
        />
        <p style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT, margin: "4px 0 14px" }}>
          Origen: <strong>{context}</strong> — {userName}
        </p>

        {saved ? (
          <div style={{ textAlign: "center", padding: "8px 0", fontSize: 13, fontWeight: 700, color: "#1D9E75", fontFamily: FONT }}>
            ✓ Mejora registrada
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn
              variant="primary"
              onClick={handleSubmit}
              disabled={!description.trim() || saving}
              style={{ flex: 1 }}
            >
              {saving ? "Guardando…" : "Enviar"}
            </Btn>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
