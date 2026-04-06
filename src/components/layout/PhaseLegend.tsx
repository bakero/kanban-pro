import { PHASE_META } from "../../constants";
import { useTheme } from "../../hooks/useTheme";
import { useLang, type TranslationKey } from "../../i18n";

export function PhaseLegend({ isMobile }: { isMobile: boolean }) {
  const T = useTheme();
  const { t } = useLang();

  const containerStyle: React.CSSProperties = isMobile
    ? { position: "sticky", bottom: 0, marginTop: 8, alignSelf: "stretch" }
    : { position: "fixed", left: 18, bottom: 16, zIndex: 120 };

  return (
    <div style={containerStyle}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 12px",
        borderRadius: 14,
        border: `1px solid ${T.border}`,
        background: isMobile ? T.bgSidebar : `${T.bgSidebar}EE`,
        backdropFilter: "blur(14px)",
        boxShadow: T.shadowSm,
        fontSize: 11,
        color: T.textSoft,
      }}>
        <span style={{ fontWeight: 700, color: T.text }}>{t("board.legendTitle")}</span>
        {(Object.entries(PHASE_META) as Array<[string, { labelKey: TranslationKey; color: string }]>).map(([key, meta]) => (
          <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
            <span>{t(meta.labelKey)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
