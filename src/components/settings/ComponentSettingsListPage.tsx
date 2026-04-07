import { Link } from "react-router-dom";
import { FONT } from "../../constants";
import { useTheme } from "../../hooks/useTheme";
import { componentCatalog } from "./componentCatalog";

interface ComponentSettingsListPageProps {
  basePath: string;
}

export function ComponentSettingsListPage({ basePath }: ComponentSettingsListPageProps) {
  const T = useTheme();
  const grouped = {
    negocio: componentCatalog.filter(item => item.category === "negocio"),
    ui: componentCatalog.filter(item => item.category === "ui"),
  };

  return (
    <div style={{ padding: "18px 20px", fontFamily: FONT, color: T.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link
          to={basePath || "/"}
          style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, textDecoration: "none" }}
        >
          Volver
        </Link>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Configuracion de componentes</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {(["negocio", "ui"] as const).map(section => (
          <div key={section} style={{ border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, background: T.bgSidebar }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textSoft, marginBottom: 10 }}>
              {section === "negocio" ? "Componentes de negocio" : "Componentes UI reutilizables"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped[section].map(item => (
                <Link
                  key={item.id}
                  to={`${basePath}/config/components/${item.id}`}
                  style={{
                    textDecoration: "none",
                    color: T.text,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: T.bg,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</span>
                  <span style={{ fontSize: 11, color: T.textSoft }}>{item.description}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
