import { useState } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { Btn } from "./ui/Btn";
import { useLang } from "../i18n";

interface NewKanbanModalProps {
  onClose: () => void;
  onCreate: (title: string, mode: string) => void;
}

export function NewKanbanModal({ onClose, onCreate }: NewKanbanModalProps) {
  const T = useTheme();
  const { t } = useLang();
  const [mode,  setMode]  = useState("empty");
  const [title, setTitle] = useState("");

  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 8,
    border: `1.5px solid ${T.border}`, padding: "9px 12px",
    width: "100%", boxSizing: "border-box",
    backgroundColor: T.bgSoft, color: T.text, outline: "none",
  };

  const OPTIONS: [string, string, string][] = [
    ["empty", t("newBoard.optionEmpty"), t("newBoard.optionEmptyHint")],
    ["copy",  t("newBoard.optionCopy"), t("newBoard.optionCopyHint")],
  ];

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
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("newBoard.modalTitle")}</span>
          <Btn variant="ghost" onClick={onClose} style={{ padding: "2px 8px" }}>×</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 4 }}>{t("newBoard.name")}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("newBoard.placeholder")} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 7 }}>{t("newBoard.config")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {OPTIONS.map(([m, l, d]) => (
                <div key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "9px 11px", borderRadius: 11,
                  border: `2px solid ${mode === m ? "#7F77DD" : T.border}`,
                  backgroundColor: mode === m ? "#7F77DD11" : T.bgSoft, cursor: "pointer",
                }}>
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, fontFamily: FONT, color: mode === m ? "#7F77DD" : T.text }}>{l}</p>
                  <p style={{ margin: 0, fontSize: 11, fontFamily: FONT, color: T.textSoft }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn variant="outline" onClick={onClose} style={{ flex: 1 }}>{t("newBoard.cancel")}</Btn>
            <Btn variant="primary" onClick={() => title.trim() && onCreate(title.trim(), mode)}
              disabled={!title.trim()} style={{ flex: 1 }}>{t("newBoard.create")}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
