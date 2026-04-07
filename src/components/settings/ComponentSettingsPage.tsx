import { Link } from "react-router-dom";
import { FONT } from "../../constants";
import { useTheme } from "../../hooks/useTheme";
import { getComponentEntry } from "./componentCatalog";

interface ComponentSettingsPageProps {
  componentId: string;
  basePath: string;
}

export function ComponentSettingsPage({ componentId, basePath }: ComponentSettingsPageProps) {
  const T = useTheme();
  const entry = getComponentEntry(componentId);

  if (!entry) {
    return (
      <div style={{ padding: "18px 20px", fontFamily: FONT, color: T.text }}>
        <Link to={`${basePath}/config/components`} style={{ fontSize: 12, color: T.textSoft, textDecoration: "none" }}>
          Volver
        </Link>
        <h2 style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 800 }}>Componente no encontrado</h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: T.textSoft }}>
          El componente solicitado no existe en el catalogo.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 20px", fontFamily: FONT, color: T.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link to={`${basePath}/config/components`} style={{ fontSize: 12, color: T.textSoft, textDecoration: "none" }}>
          Volver
        </Link>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{entry.name}</h2>
      </div>

      <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, background: T.bgSidebar, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, marginBottom: 8 }}>Resumen</div>
        <p style={{ margin: 0, fontSize: 13 }}>{entry.description}</p>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: T.textSoft }}>Archivo: {entry.path}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textSoft }}>Categoria: {entry.category === "negocio" ? "Negocio" : "UI"}</p>
      </div>

      <div style={{ marginTop: 16, border: `1px dashed ${T.border}`, borderRadius: 14, background: T.bg, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textSoft, marginBottom: 8 }}>Configuracion</div>
        <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>
          No hay opciones configurables definidas para este componente. Usa esta pagina como punto de referencia y añade
          opciones cuando el componente lo requiera.
        </p>
      </div>
    </div>
  );
}
