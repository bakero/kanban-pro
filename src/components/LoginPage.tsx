import { FONT } from "../constants";
import { useTheme, useThemeMode } from "../hooks/useTheme";
import { Btn } from "./ui/Btn";

interface LoginPageProps {
  onGoogleLogin: () => void;
  authBusy: boolean;
}

export function LoginPage({ onGoogleLogin, authBusy }: LoginPageProps) {
  const T = useTheme();
  const { mode, setMode } = useThemeMode();

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
          KANBAN PRO
          </p>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as "system" | "light" | "dark")}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text }}
          >
            <option value="system">Tema sistema</option>
            <option value="light">Modo claro</option>
            <option value="dark">Modo oscuro</option>
          </select>
        </div>
        <h1 style={{ margin: "0 0 10px", fontSize: 30, lineHeight: 1.1, color: T.text }}>
          Accede con tu cuenta de Google
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.6, color: T.textSoft }}>
          Cada usuario ve sus propios tableros y solo puede entrar en tableros compartidos cuando haya sido invitado.
        </p>
        <div style={{
          backgroundColor: T.bgElevated,
          borderRadius: 18,
          border: `1px solid ${T.border}`,
          padding: "14px 16px",
          marginBottom: 18,
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: T.text }}>Activación de cuenta</p>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: T.textSoft }}>
            Tras el acceso con Google, la aplicación registra que el login de Google está activado y usa el email verificado del proveedor como confirmación de la cuenta.
          </p>
        </div>
        <Btn
          variant="primary"
          onClick={onGoogleLogin}
          disabled={authBusy}
          style={{ width: "100%", padding: "12px 18px", fontSize: 14, borderRadius: 14 }}
        >
          {authBusy ? "Conectando..." : "Continuar con Google"}
        </Btn>
      </div>
    </div>
  );
}
