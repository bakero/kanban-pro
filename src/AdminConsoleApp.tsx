import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ThemeContext, ThemeModeContext, resolveTheme, usePrefersDark } from "./hooks/useTheme";
import { FONT, SUPER_ADMIN_EMAIL } from "./constants";
import { ensureUserProfile } from "./lib/db";
import { supabase } from "./lib/supabase";
import { AdminConsolePage } from "./admin/AdminConsolePage";
import { LoginPage } from "./components/LoginPage";
import type { User } from "./types";
import type { ThemeMode } from "./hooks/useTheme";

export default function AdminConsoleApp() {
  const prefersDark = usePrefersDark();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const T = resolveTheme(themeMode, prefersDark);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userThemeKey = currentUser?.email ? `kanban-pro:theme:${currentUser.email.toLowerCase()}` : null;

  useEffect(() => {
    if (!userThemeKey) {
      setThemeMode("system");
      return;
    }
    const stored = window.localStorage.getItem(userThemeKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeMode(stored);
      return;
    }
    setThemeMode("system");
  }, [userThemeKey]);

  useEffect(() => {
    if (!userThemeKey) return;
    window.localStorage.setItem(userThemeKey, themeMode);
  }, [themeMode, userThemeKey]);

  function withTheme(content: ReactNode) {
    return (
      <ThemeModeContext.Provider value={{ mode: themeMode, setMode: setThemeMode }}>
        <ThemeContext.Provider value={T}>
          {content}
        </ThemeContext.Provider>
      </ThemeModeContext.Provider>
    );
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    ensureUserProfile(session.user).then(profile => {
      if (cancelled) return;
      setCurrentUser(profile);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function handleGoogleLogin() {
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin.html` } });
    if (error) {
      console.error("Google login error:", error);
      setAuthBusy(false);
    }
  }

  if (authLoading) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
        Preparando consola...
      </div>,
    );
  }

  if (!session?.user) {
    return withTheme(<LoginPage onGoogleLogin={handleGoogleLogin} authBusy={authBusy} />);
  }

  if (loading || !currentUser) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.textSoft, fontFamily: FONT }}>
        Cargando consola...
      </div>,
    );
  }

  if (currentUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return withTheme(
      <div style={{ minHeight: "100vh", background: T.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 24 }}>
          <div style={{ maxWidth: 540, background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 22, padding: 24, boxShadow: T.shadowMd, backdropFilter: "blur(16px)" }}>
            <h1 style={{ margin: "0 0 10px", fontSize: 22, color: T.text }}>Acceso restringido</h1>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: T.textSoft }}>
              Esta consola solo esta disponible para {SUPER_ADMIN_EMAIL}. Tu usuario puede seguir usando la aplicacion principal.
            </p>
            <a
              href="/"
              style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: T.accent, textDecoration: "none" }}
            >
              Ir a la app
            </a>
          </div>
        </div>,
    );
  }

  return withTheme(
    <AdminConsolePage currentUser={currentUser} onBack={() => { window.location.href = "/"; }} />,
  );
}
