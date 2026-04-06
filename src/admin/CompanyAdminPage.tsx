import { useEffect, useMemo, useState } from "react";
import { FONT, SUPER_ADMIN_EMAIL } from "../constants";
import { useTheme, useThemeMode } from "../hooks/useTheme";
import {
  assignUserToCompany,
  createCompanyBackup,
  createProject,
  getOrCreateWorkspace,
  loadAllCompanyProjects,
  loadCompanyBackups,
  loadCompanyBoards,
  loadCompanyCards,
  loadCompanyFeatures,
  loadCompanyImprovements,
  loadCompanyLogs,
  loadCompanyMembers,
  loadCompanySettings,
  loadFeatureCatalog,
  logCompanyAdminAction,
  saveCompanySettings,
  setCompanyFeature,
} from "../lib/db";
import { supabase } from "../lib/supabase";
import { Btn } from "../components/ui/Btn";
import type {
  Company,
  CompanyBackup,
  CompanyFeature,
  CompanyMember,
  CompanyRole,
  CompanySettings,
  Feature,
  FeatureFlags,
  Project,
  Board,
  Card,
  Improvement,
  BoardLog,
  User,
} from "../types";

type CompanyAdminSection =
  | "empresa"
  | "usuarios"
  | "proyectos"
  | "tableros"
  | "trabajos"
  | "mejoras"
  | "logs"
  | "backups"
  | "funcionalidades";

interface CompanyAdminPageProps {
  currentUser: User;
  company: Company;
  companyRole: CompanyRole;
  featureFlags: FeatureFlags;
  onBack: () => void;
}

export function CompanyAdminPage({ currentUser, company, companyRole, featureFlags, onBack }: CompanyAdminPageProps) {
  const T = useTheme();
  const { mode, setMode } = useThemeMode();
  const [section, setSection] = useState<CompanyAdminSection>("empresa");
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [logs, setLogs] = useState<BoardLog[]>([]);
  const [backups, setBackups] = useState<CompanyBackup[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<Feature[]>([]);
  const [companyFeatures, setCompanyFeatures] = useState<CompanyFeature[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<CompanyRole>("member");
  const [memberFeedback, setMemberFeedback] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectPrefix, setProjectPrefix] = useState("");
  const [projectFeedback, setProjectFeedback] = useState("");

  const [backupSummary, setBackupSummary] = useState("");
  const [backupFeedback, setBackupFeedback] = useState("");

  const canManageCompany = companyRole === "company_admin";

  const sections: { id: CompanyAdminSection; label: string }[] = [
    { id: "empresa", label: "Empresa" },
    { id: "usuarios", label: "Usuarios" },
    { id: "proyectos", label: "Proyectos" },
    { id: "tableros", label: "Tableros" },
    { id: "trabajos", label: "Trabajos" },
    { id: "mejoras", label: "Mejoras" },
    ...((featureFlags.logs_backups ? [
      { id: "logs" as CompanyAdminSection, label: "Logs" },
      { id: "backups" as CompanyAdminSection, label: "Backups" },
    ] : [])),
    { id: "funcionalidades", label: "Funcionalidades" },
  ];

  const inputStyle: React.CSSProperties = {
    fontFamily: FONT,
    fontSize: 13,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    padding: "9px 10px",
    backgroundColor: T.bgElevated,
    color: T.text,
    outline: "none",
    boxSizing: "border-box",
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadFeatureCatalog()]).then(([features]) => {
      if (cancelled) return;
      setFeatureCatalog(features);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadCompanyMembers(company.id),
      loadAllCompanyProjects(company.id),
      loadCompanyBoards(company.id),
      loadCompanyCards(company.id),
      loadCompanyImprovements(company.id),
      featureFlags.logs_backups ? loadCompanyLogs(company.id) : Promise.resolve([]),
      featureFlags.logs_backups ? loadCompanyBackups(company.id) : Promise.resolve([]),
      loadCompanySettings(company.id),
      loadCompanyFeatures(company.id),
    ]).then(([mems, projs, brds, cds, imps, logsData, backupsData, settings, features]) => {
      if (cancelled) return;
      setMembers(mems);
      setProjects(projs);
      setBoards(brds);
      setCards(cds);
      setImprovements(imps);
      setLogs(logsData as BoardLog[]);
      setBackups(backupsData as CompanyBackup[]);
      setCompanySettings(settings);
      setCompanyFeatures(features);
    });
    return () => {
      cancelled = true;
    };
  }, [company.id, featureFlags.logs_backups]);

  async function handleAddMember() {
    if (!canManageCompany) return;
    const email = memberEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      setMemberFeedback("Email invalido.");
      return;
    }
    const { data: userRow } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (!userRow) {
      setMemberFeedback("El usuario debe iniciar sesion al menos una vez.");
      return;
    }
    await assignUserToCompany(company.id, (userRow as User).id, memberRole, currentUser.id);
    await logCompanyAdminAction(company.id, currentUser.id, "assign_user", "user", (userRow as User).id, { role: memberRole });
    const updated = await loadCompanyMembers(company.id);
    setMembers(updated);
    setMemberEmail("");
    setMemberFeedback(`Usuario asignado como ${memberRole}.`);
  }

  async function handleCreateProject() {
    if (!canManageCompany) return;
    const name = projectName.trim();
    const prefix = projectPrefix.trim().toUpperCase();
    if (!name || !prefix) {
      setProjectFeedback("Nombre y prefijo son obligatorios.");
      return;
    }
    const workspace = await getOrCreateWorkspace(company.id, currentUser.id);
    const project = await createProject(workspace.id, name, prefix, currentUser.id);
    await logCompanyAdminAction(company.id, currentUser.id, "create_project", "project", project.id, { name, prefix });
    const projs = await loadAllCompanyProjects(company.id);
    setProjects(projs);
    setProjectName("");
    setProjectPrefix("");
    setProjectFeedback("Proyecto creado.");
  }

  async function handleUpdateCompanySettings(partial: Partial<CompanySettings>) {
    if (!canManageCompany) return;
    const base: CompanySettings = companySettings || {
      company_id: company.id,
      log_retention_days: 30,
      backup_retention_count: 10,
      backup_enabled: true,
      updated_at: new Date().toISOString(),
    };
    const updated = { ...base, ...partial, updated_at: new Date().toISOString() };
    await saveCompanySettings(updated);
    await logCompanyAdminAction(company.id, currentUser.id, "update_company_settings", "company", company.id, partial as Record<string, unknown>);
    setCompanySettings(updated);
  }

  async function handleCreateBackup() {
    if (!canManageCompany || !featureFlags.logs_backups) return;
    const summary = backupSummary.trim() || "Backup manual";
    await createCompanyBackup(company.id, currentUser.id, summary);
    await logCompanyAdminAction(company.id, currentUser.id, "create_backup", "company_backup", null, { summary });
    const refreshed = await loadCompanyBackups(company.id);
    setBackups(refreshed);
    setBackupSummary("");
    setBackupFeedback("Backup generado.");
  }

  async function handleCompanyFeatureToggle(featureKey: string, enabled: boolean) {
    if (!canManageCompany) return;
    await setCompanyFeature(company.id, featureKey, enabled, currentUser.id);
    await logCompanyAdminAction(company.id, currentUser.id, "toggle_feature", "feature", featureKey, { enabled });
    const updated = await loadCompanyFeatures(company.id);
    setCompanyFeatures(updated);
  }

  const companyFeatureMap = useMemo(() => new Map(companyFeatures.map(f => [f.feature_key, f.is_enabled])), [companyFeatures]);

  if (currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
    // Super admin deberia usar la consola global
    return (
      <div style={{ fontFamily: FONT, padding: 32, color: T.textSoft }}>
        Esta vista esta pensada para admins de empresa. Usa la consola global.
      </div>
    );
  }

  if (!canManageCompany) {
    return (
      <div style={{ fontFamily: FONT, padding: 32, color: T.danger, fontWeight: 700 }}>
        Acceso denegado.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <p style={{ color: T.textSoft }}>Cargando consola...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh" }}>
      <div style={{ backgroundColor: T.bgSidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(18px)", position: "sticky", top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          ← Volver
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT, color: T.text }}>Consola Empresa</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, padding: "6px 10px", borderRadius: 999, background: T.accentSoft, border: `1px solid ${T.border}` }}>{company.name}</span>
        <div style={{ flex: 1 }} />
        <select
          value={mode}
          onChange={e => setMode(e.target.value as "system" | "light" | "dark")}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text }}
        >
          <option value="system">Tema sistema</option>
          <option value="light">Modo claro</option>
          <option value="dark">Modo oscuro</option>
        </select>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        <div style={{ width: 220, backgroundColor: T.bgSidebar, borderRight: `1px solid ${T.border}`, padding: "16px 10px", flexShrink: 0, backdropFilter: "blur(18px)" }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ width: "100%", textAlign: "left", fontFamily: FONT, fontSize: 13, fontWeight: section === s.id ? 700 : 500, padding: "10px 13px", borderRadius: 12, border: `1px solid ${section === s.id ? T.accent : "transparent"}`, backgroundColor: section === s.id ? T.accentSoft : "transparent", color: section === s.id ? T.accent : T.textSoft, cursor: "pointer", marginBottom: 5, display: "block" }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {section === "empresa" && (
            <div>
              <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: T.text }}>Configuracion</h2>
              {!featureFlags.logs_backups && (
                <p style={{ color: T.textSoft }}>Logs y backups estan desactivados para esta empresa.</p>
              )}
              {featureFlags.logs_backups && (
                <div style={{ backgroundColor: T.bgSidebar, borderRadius: 16, border: `1px solid ${T.border}`, padding: 14, boxShadow: T.shadowSm }}>
                  <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>Retencion de logs (dias)</label>
                  <input
                    type="number"
                    min={1}
                    value={companySettings?.log_retention_days ?? 30}
                    onChange={e => handleUpdateCompanySettings({ log_retention_days: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ ...inputStyle, width: "100%", margin: "6px 0 12px" }}
                  />
                  <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>Retencion de backups</label>
                  <input
                    type="number"
                    min={1}
                    value={companySettings?.backup_retention_count ?? 10}
                    onChange={e => handleUpdateCompanySettings({ backup_retention_count: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ ...inputStyle, width: "100%", margin: "6px 0 12px" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: T.text }}>
                    <input
                      type="checkbox"
                      checked={companySettings?.backup_enabled ?? true}
                      onChange={e => handleUpdateCompanySettings({ backup_enabled: e.target.checked })}
                    />
                    Backups automaticos activos
                  </label>
                </div>
              )}
            </div>
          )}

          {section === "usuarios" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Usuarios de empresa</h2>
              {members.map(m => (
                <div key={m.id} style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{m.user?.name || m.user_id}</p>
                    <p style={{ margin: 0, fontSize: 11, color: T.textSoft }}>{m.user?.email || ""}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{m.role}</span>
                </div>
              ))}

              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginTop: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>Asignar usuario</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="email@empresa.com" style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
                  <select value={memberRole} onChange={e => setMemberRole(e.target.value as CompanyRole)} style={{ ...inputStyle, width: "auto" }}>
                    {["company_admin", "project_manager", "member", "viewer"].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <Btn variant="primary" onClick={handleAddMember}>Asignar</Btn>
                </div>
                {!!memberFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{memberFeedback}</p>}
              </div>
            </div>
          )}

          {section === "proyectos" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Proyectos</h2>
              {projects.map(project => (
                <div key={project.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{project.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>Prefijo: {project.prefix}</p>
                </div>
              ))}

              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginTop: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>Crear proyecto</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <input value={projectPrefix} onChange={e => setProjectPrefix(e.target.value)} placeholder="PRJ" style={{ ...inputStyle, width: 80, textAlign: "center" }} />
                  <Btn variant="primary" onClick={handleCreateProject}>Crear</Btn>
                </div>
                {!!projectFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{projectFeedback}</p>}
              </div>
            </div>
          )}

          {section === "tableros" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Tableros</h2>
              {boards.map(board => (
                <div key={board.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{board.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>ID: {board.id}</p>
                </div>
              ))}
            </div>
          )}

          {section === "trabajos" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Trabajos (tarjetas)</h2>
              {cards.map(card => (
                <div key={card.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{card.card_id} - {card.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>Board: {card.board_id}</p>
                </div>
              ))}
            </div>
          )}

          {section === "mejoras" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Mejoras</h2>
              {improvements.map(imp => (
                <div key={imp.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{imp.description}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    Estado: {imp.status} · 👍 {imp.vote_count || 0} · Usuario: {imp.user_name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "logs" && featureFlags.logs_backups && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Logs</h2>
              {logs.map(log => (
                <div key={log.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.text }}>{log.entity_type} · {log.change}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    Empresa: {log.company_id} · User: {log.user_id} · Elemento: {log.entity_id}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    Board: {log.board_id} · {new Date(log.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "backups" && featureFlags.logs_backups && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Backups</h2>
              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginBottom: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>Backup manual</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={backupSummary} onChange={e => setBackupSummary(e.target.value)} placeholder="Resumen" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <Btn variant="primary" onClick={handleCreateBackup}>Crear backup</Btn>
                </div>
                {!!backupFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{backupFeedback}</p>}
              </div>
              {backups.map(b => (
                <div key={b.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.text }}>{b.summary}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    {new Date(b.created_at).toLocaleString("es-ES")} · {b.created_by}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "funcionalidades" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>Funcionalidades</h2>
              {featureCatalog.map(feature => {
                const override = companyFeatureMap.get(feature.key);
                const effective = feature.is_mandatory ? true : (override ?? feature.default_on);
                return (
                  <div key={feature.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{feature.label}</p>
                        {feature.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{feature.description}</p>}
                      </div>
                      {feature.is_mandatory ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>OBLIGATORIO</span>
                      ) : (
                        <label style={{ fontSize: 11, color: T.textSoft }}>
                          Activa
                          <input type="checkbox" checked={!!effective}
                            onChange={e => handleCompanyFeatureToggle(feature.key, e.target.checked)} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
