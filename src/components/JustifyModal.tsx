import { useState } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { Btn } from "./ui/Btn";
import { useLang } from "../i18n";

interface JustifyModalProps {
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function JustifyModal({ title, onConfirm, onCancel }: JustifyModalProps) {
  const T = useTheme();
  const { t } = useLang();
  const [reason, setReason] = useState("");

  const inp: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 13,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    padding: "9px 10px",
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: T.bgElevated,
    color: T.text,
    outline: "none",
    resize: "vertical",
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: T.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 800,
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: T.bgSidebar,
          borderRadius: 24,
          border: `1px solid ${T.danger}`,
          width: "100%",
          maxWidth: 420,
          padding: 24,
          boxShadow: T.shadowLg,
          backdropFilter: "blur(18px)",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.danger }}>
          {t("justify.notice", { title })}
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 13, fontFamily: FONT, color: T.textSoft }}>
          {t("justify.required")}
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder={t("justify.placeholder")}
          style={inp}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Btn variant="outline" onClick={onCancel} style={{ flex: 1 }}>{t("justify.cancel")}</Btn>
          <Btn variant="danger" onClick={() => reason.trim() && onConfirm(reason)} disabled={!reason.trim()} style={{ flex: 1 }}>
            {t("justify.confirm")}
          </Btn>
        </div>
      </div>
    </div>
  );
}
