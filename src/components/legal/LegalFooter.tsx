import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useLang } from "../../i18n";

export function LegalFooter() {
  const T = useTheme();
  const { t } = useLang();
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 18 }}>
      <Link to="/legal/aviso-legal" style={{ fontSize: 11, color: T.textSoft, textDecoration: "none" }}>
        {t("legal.footer.notice")}
      </Link>
      <Link to="/legal/privacidad" style={{ fontSize: 11, color: T.textSoft, textDecoration: "none" }}>
        {t("legal.footer.privacy")}
      </Link>
      <Link to="/legal/cookies" style={{ fontSize: 11, color: T.textSoft, textDecoration: "none" }}>
        {t("legal.footer.cookies")}
      </Link>
    </div>
  );
}
