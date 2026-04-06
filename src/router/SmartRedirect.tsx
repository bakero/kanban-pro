import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { resolveEntityByCode } from "../lib/db";
import { useTheme } from "../hooks/useTheme";
import { FONT } from "../constants";
import { useLang } from "../i18n";

export function SmartRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const T = useTheme();
  const { t } = useLang();
  const [status, setStatus] = useState<"loading" | "not_found">("loading");
  const basePath = location.pathname.startsWith("/app/") ? "/app" : "";

  useEffect(() => {
    if (!code) { navigate(basePath || "/", { replace: true }); return; }

    resolveEntityByCode(code).then(result => {
      if (!result) { setStatus("not_found"); return; }

      switch (result.type) {
        case "company":
          navigate(`${basePath}/`, { replace: true, state: { companyId: result.id } });
          break;
        case "project":
          navigate(`${basePath}/`, { replace: true, state: { companyId: result.companyId, workspaceId: result.workspaceId, projectId: result.id } });
          break;
        case "card":
          navigate(`${basePath}/board/${result.boardNumericId ?? result.boardId}/card/${result.id}`, { replace: true });
          break;
        case "workspace":
          navigate(
            result.workspace.numeric_id
              ? `${basePath}/workspace/${result.workspace.numeric_id}`
              : `${basePath}/`,
            { replace: true, state: result.workspace.numeric_id ? undefined : { workspaceId: result.id } },
          );
          break;
        case "board":
          navigate(`${basePath}/board/${(result.board as { numeric_id?: number }).numeric_id ?? result.id}`, { replace: true });
          break;
      }
    });
  }, [code, navigate]);

  if (status === "not_found") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, fontFamily: FONT, gap: 16 }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>[]</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>{t("router.notFoundTitle")}</p>
        <p style={{ fontSize: 14, color: T.textSoft, margin: 0 }}>
          {t("router.notFoundBody", { code: code || "" })}
        </p>
        <button
          onClick={() => navigate(basePath || "/")}
          style={{ marginTop: 8, fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 12, border: "none", background: T.accent, color: "#fff", cursor: "pointer" }}
        >
          {t("app.goToApp")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, fontFamily: FONT }}>
      <p style={{ fontSize: 14, color: T.textSoft }}>{t("router.resolving")}</p>
    </div>
  );
}
