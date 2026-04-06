import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { FONT } from "../../constants";
import { useLang } from "../../i18n";

type LegalKind = "aviso-legal" | "privacidad" | "cookies";

export function LegalPage() {
  const { slug } = useParams<{ slug: LegalKind }>();
  const T = useTheme();
  const { t } = useLang();

  const kind = (slug || "aviso-legal") as LegalKind;
  const title = useMemo(() => {
    if (kind === "privacidad") return t("legal.privacyTitle");
    if (kind === "cookies") return t("legal.cookiesTitle");
    return t("legal.noticeTitle");
  }, [kind, t]);

  const sections = [
    { id: "responsible", label: t("legal.section.responsible") },
    { id: "purpose", label: t("legal.section.purpose") },
    { id: "legalBasis", label: t("legal.section.legalBasis") },
    { id: "data", label: t("legal.section.data") },
    { id: "recipients", label: t("legal.section.recipients") },
    { id: "retention", label: t("legal.section.retention") },
    { id: "rights", label: t("legal.section.rights") },
    { id: "cookies", label: t("legal.section.cookies") },
    { id: "ai", label: t("legal.section.ai") },
    { id: "security", label: t("legal.section.security") },
    { id: "contact", label: t("legal.section.contact") },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: FONT, color: T.text }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.textSoft }}>{t("legal.title")}</p>
            <h1 style={{ margin: "6px 0 0", fontSize: 28, color: T.text }}>{title}</h1>
          </div>
          <Link to="/" style={{ fontSize: 12, fontWeight: 700, color: T.accent, textDecoration: "none" }}>
            {t("app.goToApp")}
          </Link>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <Link to="/legal/aviso-legal" style={{ fontSize: 12, color: kind === "aviso-legal" ? T.accent : T.textSoft, textDecoration: "none" }}>
            {t("legal.noticeTitle")}
          </Link>
          <Link to="/legal/privacidad" style={{ fontSize: 12, color: kind === "privacidad" ? T.accent : T.textSoft, textDecoration: "none" }}>
            {t("legal.privacyTitle")}
          </Link>
          <Link to="/legal/cookies" style={{ fontSize: 12, color: kind === "cookies" ? T.accent : T.textSoft, textDecoration: "none" }}>
            {t("legal.cookiesTitle")}
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {sections.map(section => (
            <div key={section.id} style={{ padding: "16px 18px", borderRadius: 16, border: `1px solid ${T.border}`, background: T.bgSidebar }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>{section.label}</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: T.textSoft }}>
                {t("legal.placeholder")}
              </p>
            </div>
          ))}
          {kind === "cookies" && (
            <div style={{ padding: "16px 18px", borderRadius: 16, border: `1px solid ${T.border}`, background: T.bgSidebar }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>{t("legal.section.cookies")}</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: T.textSoft }}>
                {t("legal.cookiesPlaceholder")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
