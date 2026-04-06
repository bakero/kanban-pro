import { useEffect, useMemo, useState } from "react";
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
import { LangContext, translate, type Lang, type TranslationKey } from "./i18n";

export default function AdminConsoleApp() {
  const prefersDark = usePrefersDark();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [lang, setLang] = useState<Lang>("es");
  const t = useMemo(
    () => (key: TranslationKey, params?: Record<string, string | number>) => translate(key, lang, params),
    [lang],
  );
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

  useEffect(() => {
    const stored = window.localStorage.getItem("kanban-pro:lang:last");
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kanban-pro:lang:last", lang);
  }, [lang]);

  useEffect(() => {
    if (!currentUser?.lang) return;
    setLang(currentUser.lang as Lang);
  }, [currentUser?.lang]);

  function withTheme(content: ReactNode) {
    return (
      <ThemeModeContext.Provider value={{ mode: themeMode, setMode: setThemeMode }}>
        <ThemeContext.Provider value={T}>
          <LangContext.Provider value={{ lang, setLang }}>
            {content}
          </LangContext.Provider>
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
        {t("app.preparingConsole")}
      </div>,
    );
  }

  if (!session?.user) {
    return withTheme(<LoginPage onGoogleLogin={handleGoogleLogin} authBusy={authBusy} />);
  }

  if (loading || !currentUser) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.textSoft, fontFamily: FONT }}>
        {t("app.loadingConsole")}
      </div>,
    );
  }

  if (currentUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return withTheme(
      <div style={{ minHeight: "100vh", background: T.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: 24 }}>
          <div style={{ maxWidth: 540, background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 22, padding: 24, boxShadow: T.shadowMd, backdropFilter: "blur(16px)" }}>
            <h1 style={{ margin: "0 0 10px", fontSize: 22, color: T.text }}>{t("app.restrictedAccess")}</h1>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: T.textSoft }}>
              {t("app.restrictedAccessBody", { email: SUPER_ADMIN_EMAIL })}
            </p>
            <a
              href="/"
              style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: T.accent, textDecoration: "none" }}
            >
              {t("app.goToApp")}
            </a>
          </div>
        </div>,
    );
  }

  return withTheme(
    <AdminConsolePage currentUser={currentUser} onBack={() => { window.location.href = "/"; }} />,
  );
}



