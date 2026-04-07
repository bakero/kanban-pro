import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import App from "../App";
import { SmartRedirect } from "./SmartRedirect";
import { ThemeContext, ThemeModeContext, resolveTheme, usePrefersDark } from "../hooks/useTheme";
import type { ThemeMode } from "../hooks/useTheme";
import { LangContext } from "../i18n";
import type { Lang } from "../i18n";
import { LegalPage } from "../components/legal/LegalPage";

/**
 * AppRouter - defines all URL routes for the application.
 *
 * Route structure:
 *   /                              -> Main board view (default)
 *   /board/:boardId                -> Open specific board by numeric_id
 *   /board/:boardId/card/:cardId   -> Open board + card modal by DB id
 *   /workspace/:workspaceId        -> Open specific workspace by numeric_id
 *   /:companyId/:projectId/:boardId(/:cardId) -> Open hierarchical path
 *   /:companyId/:workspaceId/:projectId/:boardId(/:cardId) -> Open hierarchical path with workspace
 *   /:code                         -> SmartRedirect: resolves company_code,
 *                                    project prefix, or card ID (PROJECT-NNN)
 *   /legal/:slug                   -> Public legal pages
 */

function ThemeShell({ children }: { children: React.ReactNode }) {
  const prefersDark = usePrefersDark();
  const [themeMode] = useState<ThemeMode>("system");
  const T = resolveTheme(themeMode, prefersDark);
  return (
    <ThemeModeContext.Provider value={{ mode: themeMode, setMode: () => undefined }}>
      <ThemeContext.Provider value={T}>
        {children}
      </ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}

function LangShell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("kanban-pro:lang:last") : null;
    return stored === "en" ? "en" : "es";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("kanban-pro:lang:last", lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function AppRouter() {
 return (
    <Routes>
      {/* Main app - default view */}
      <Route path="/" element={<App />} />
      <Route path="/app" element={<App />} />

      {/* Board by numeric_id, optionally with a card open */}
      <Route path="/board/:boardNumericId" element={<App />} />
      <Route path="/board/:boardNumericId/card/:openCardId" element={<App />} />
      <Route path="/app/board/:boardNumericId" element={<App />} />
      <Route path="/app/board/:boardNumericId/card/:openCardId" element={<App />} />

      {/* Workspace by numeric_id */}
      <Route path="/workspace/:workspaceNumericId" element={<App />} />
      <Route path="/app/workspace/:workspaceNumericId" element={<App />} />

      {/* Hierarchical IDs: /company(/workspace)/project/board(/card) */}
      <Route path="/:companyId/:projectId/:boardId" element={<App />} />
      <Route path="/:companyId/:projectId/:boardId/:cardId" element={<App />} />
      <Route path="/:companyId/:workspaceId/:projectId/:boardId" element={<App />} />
      <Route path="/:companyId/:workspaceId/:projectId/:boardId/:cardId" element={<App />} />
      <Route path="/app/:companyId/:projectId/:boardId" element={<App />} />
      <Route path="/app/:companyId/:projectId/:boardId/:cardId" element={<App />} />
      <Route path="/app/:companyId/:workspaceId/:projectId/:boardId" element={<App />} />
      <Route path="/app/:companyId/:workspaceId/:projectId/:boardId/:cardId" element={<App />} />

      {/* Public legal pages */}
      <Route
        path="/legal/:slug"
        element={
          <ThemeShell>
            <LangShell>
              <LegalPage />
            </LangShell>
          </ThemeShell>
        }
      />

      {/* Component configuration pages */}
      <Route path="/config/components" element={<App />} />
      <Route path="/config/components/:componentId" element={<App />} />
      <Route path="/app/config/components" element={<App />} />
      <Route path="/app/config/components/:componentId" element={<App />} />

      {/* Smart code resolver - MUST be last to avoid overriding specific routes */}
      <Route
        path="/:code"
        element={
          <ThemeShell>
            <LangShell>
              <SmartRedirect />
            </LangShell>
          </ThemeShell>
        }
      />
      <Route
        path="/app/:code"
        element={
          <ThemeShell>
            <LangShell>
              <SmartRedirect />
            </LangShell>
          </ThemeShell>
        }
      />
    </Routes>
  );
}
