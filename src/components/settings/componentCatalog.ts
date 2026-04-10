export type ComponentCategory = "negocio" | "ui";

export interface ComponentCatalogEntry {
  id: string;
  name: string;
  path: string;
  category: ComponentCategory;
  description: string;
}

export const componentCatalog: ComponentCatalogEntry[] = [
  { id: "app", name: "App", path: "src/App.tsx", category: "negocio", description: "Contenedor principal de la app y orquestacion de vistas." },
  { id: "login-page", name: "LoginPage", path: "src/components/LoginPage.tsx", category: "negocio", description: "Pantalla de acceso de usuarios." },
  { id: "settings-page", name: "SettingsPage", path: "src/components/settings/SettingsPage.tsx", category: "negocio", description: "Configuracion funcional del tablero, miembros y empresa." },
  { id: "improvements-page", name: "ImprovementsPage", path: "src/components/ImprovementsPage.tsx", category: "negocio", description: "Gestion y votacion de mejoras por empresa." },
  { id: "empresa-page", name: "EmpresaPage", path: "src/components/EmpresaPage.tsx", category: "negocio", description: "Pagina de empresa con widgets y dashboard." },
  { id: "profile-page", name: "ProfilePage", path: "src/components/ProfilePage.tsx", category: "negocio", description: "Pantalla de datos del perfil de usuario." },
  { id: "user-profile-panel", name: "UserProfilePanel", path: "src/components/UserProfilePanel.tsx", category: "negocio", description: "Panel de perfil del usuario conectado." },
  { id: "legal-page", name: "LegalPage", path: "src/components/legal/LegalPage.tsx", category: "negocio", description: "Paginas legales publicas." },
  { id: "admin-console-app", name: "AdminConsoleApp", path: "src/AdminConsoleApp.tsx", category: "negocio", description: "Shell de la consola administrativa global." },
  { id: "admin-console-page", name: "AdminConsolePage", path: "src/admin/AdminConsolePage.tsx", category: "negocio", description: "Consola global multi-tenant para super admin." },
  { id: "company-admin-page", name: "CompanyAdminPage", path: "src/admin/CompanyAdminPage.tsx", category: "negocio", description: "Consola de administracion por empresa." },
  { id: "super-admin-page", name: "SuperAdminPage", path: "src/components/admin/SuperAdminPage.tsx", category: "negocio", description: "Vista de super admin dentro de la app principal." },

  { id: "card-modal", name: "CardModal", path: "src/components/CardModal.tsx", category: "ui", description: "Modal de detalle y edicion de tarjeta." },
  { id: "justify-modal", name: "JustifyModal", path: "src/components/JustifyModal.tsx", category: "ui", description: "Modal de justificacion para descartar o reabrir." },
  { id: "improvement-btn", name: "ImprovementBtn", path: "src/components/ImprovementBtn.tsx", category: "ui", description: "Boton flotante para proponer mejora." },
  { id: "improvement-modal", name: "ImprovementModal", path: "src/components/ImprovementModal.tsx", category: "ui", description: "Modal para proponer una mejora." },
  { id: "kcard", name: "KCard", path: "src/components/KCard.tsx", category: "ui", description: "Tarjeta Kanban en la vista de tablero." },
  { id: "new-kanban-modal", name: "NewKanbanModal", path: "src/components/NewKanbanModal.tsx", category: "ui", description: "Modal para crear tableros." },
  { id: "user-modal", name: "UserModal", path: "src/components/UserModal.tsx", category: "ui", description: "Modal para crear usuarios." },
  { id: "phase-legend", name: "PhaseLegend", path: "src/components/layout/PhaseLegend.tsx", category: "ui", description: "Leyenda de fases del tablero." },
  { id: "secondary-bar", name: "SecondaryBar", path: "src/components/layout/SecondaryBar.tsx", category: "ui", description: "Barra secundaria de acciones." },
  { id: "secondary-bar-editor", name: "SecondaryBarEditor", path: "src/components/layout/SecondaryBarEditor.tsx", category: "ui", description: "Editor de la barra secundaria." },
  { id: "legal-footer", name: "LegalFooter", path: "src/components/legal/LegalFooter.tsx", category: "ui", description: "Pie legal comun." },
  { id: "avatar", name: "Avatar", path: "src/components/ui/Avatar.tsx", category: "ui", description: "Avatar reutilizable con fallback." },
  { id: "btn", name: "Btn", path: "src/components/ui/Btn.tsx", category: "ui", description: "Boton reutilizable con variantes." },
  { id: "drag-list", name: "DragList", path: "src/components/ui/DragList.tsx", category: "ui", description: "Lista drag and drop." },
  { id: "field-row", name: "FieldRow", path: "src/components/ui/FieldRow.tsx", category: "ui", description: "Fila de campo reutilizable." },
  { id: "toggle", name: "Toggle", path: "src/components/ui/Toggle.tsx", category: "ui", description: "Toggle reutilizable." },
  { id: "type-icon", name: "TypeIcon", path: "src/components/ui/TypeIcon.tsx", category: "ui", description: "Icono de tipo de tarjeta." },
  { id: "user-picker", name: "UserPicker", path: "src/components/ui/UserPicker.tsx", category: "ui", description: "Selector de usuario reutilizable." },
];

export function getComponentEntry(id: string | null | undefined) {
  if (!id) return null;
  return componentCatalog.find(entry => entry.id === id) || null;
}
