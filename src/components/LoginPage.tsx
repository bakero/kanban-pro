import { FONT } from "../constants";
import { useTheme, useThemeMode } from "../hooks/useTheme";
import { Btn } from "./ui/Btn";
import { useLang } from "../i18n";
import { LegalFooter } from "./legal/LegalFooter";

interface LoginPageProps {
  onGoogleLogin: () => void;
  authBusy: boolean;
}

export function LoginPage({ onGoogleLogin, authBusy }: LoginPageProps) {
  const T = useTheme();
  const { mode, setMode } = useThemeMode();
  const { t } = useLang();

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${T.bg} 0%, ${T.bgSoft} 65%, ${T.accentSoft} 100%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: FONT,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 460,
        backgroundColor: T.bgSidebar,
        border: `1px solid ${T.border}`,
        borderRadius: 28,
        padding: 30,
        boxShadow: T.shadowLg,
        backdropFilter: "blur(18px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 1.1 }}>
            {t("app.brand")}
          </p>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as "system" | "light" | "dark")}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text }}
          >
            <option value="system">{t("theme.system")}</option>
            <option value="light">{t("theme.light")}</option>
            <option value="dark">{t("theme.dark")}</option>
          </select>
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: 30, lineHeight: 1.1, color: T.text }}>
          {t("auth.loginTitle")}
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.6, color: T.textSoft }}>
          {t("auth.loginBody")}
        </p>
        <div style={{
          backgroundColor: T.bgElevated,
          borderRadius: 18,
          border: `1px solid ${T.border}`,
          padding: "14px 16px",
          marginBottom: 18,
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("auth.accountActivation")}</p>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: T.textSoft }}>
            {t("auth.accountActivationBody")}
          </p>
        </div>
        <Btn
          variant="primary"
          onClick={onGoogleLogin}
          disabled={authBusy}
          style={{ width: "100%", padding: "12px 18px", fontSize: 14, borderRadius: 14 }}
        >
          {authBusy ? t("auth.connecting") : t("auth.continueWithGoogle")}
        </Btn>
        <LegalFooter />
      </div>
    </div>
  );
}
