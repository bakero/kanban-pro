import { useEffect, useMemo, useState } from "react";
import { FONT, SUPER_ADMIN_EMAIL } from "../constants";
import { useTheme, useThemeMode } from "../hooks/useTheme";
import { useLang } from "../i18n";
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
  const { t, lang } = useLang();
  const locale = lang === "es" ? "es-ES" : "en-US";
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
    { id: "empresa", label: t("admin.section.company") },
    { id: "usuarios", label: t("admin.section.users") },
    { id: "proyectos", label: t("admin.section.projects") },
    { id: "tableros", label: t("admin.section.boards") },
    { id: "trabajos", label: t("admin.section.cards") },
    { id: "mejoras", label: t("admin.section.improvements") },
    ...((featureFlags.logs_backups ? [
      { id: "logs" as CompanyAdminSection, label: t("admin.section.logs") },
      { id: "backups" as CompanyAdminSection, label: t("admin.section.backups") },
    ] : [])),
    { id: "funcionalidades", label: t("admin.section.features") },
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
      setMemberFeedback(t("admin.memberEmailInvalid"));
      return;
    }
    const { data: userRow } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (!userRow) {
      setMemberFeedback(t("admin.memberNeedsLogin"));
      return;
    }
    await assignUserToCompany(company.id, (userRow as User).id, memberRole, currentUser.id);
    await logCompanyAdminAction(company.id, currentUser.id, "assign_user", "user", (userRow as User).id, { role: memberRole });
    const updated = await loadCompanyMembers(company.id);
    setMembers(updated);
    setMemberEmail("");
    setMemberFeedback(t("admin.memberAssigned", { role: memberRole }));
  }

  async function handleCreateProject() {
    if (!canManageCompany) return;
    const name = projectName.trim();
    const prefix = projectPrefix.trim().toUpperCase();
    if (!name || !prefix) {
      setProjectFeedback(t("admin.projectRequired"));
      return;
    }
    const workspace = await getOrCreateWorkspace(company.id, currentUser.id);
    const project = await createProject(workspace.id, name, prefix, currentUser.id);
    await logCompanyAdminAction(company.id, currentUser.id, "create_project", "project", project.id, { name, prefix });
    const projs = await loadAllCompanyProjects(company.id);
    setProjects(projs);
    setProjectName("");
    setProjectPrefix("");
    setProjectFeedback(t("admin.projectCreated"));
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
    const summary = backupSummary.trim() || t("settings.backupManualDefault");
    await createCompanyBackup(company.id, currentUser.id, summary);
    await logCompanyAdminAction(company.id, currentUser.id, "create_backup", "company_backup", null, { summary });
    const refreshed = await loadCompanyBackups(company.id);
    setBackups(refreshed);
    setBackupSummary("");
    setBackupFeedback(t("settings.backupGenerated"));
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
        {t("admin.companyConsoleOnly")}
      </div>
    );
  }

  if (!canManageCompany) {
    return (
      <div style={{ fontFamily: FONT, padding: 32, color: T.danger, fontWeight: 700 }}>
        {t("admin.accessDenied")}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <p style={{ color: T.textSoft }}>{t("app.loadingConsole")}</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh" }}>
      <div style={{ backgroundColor: T.bgSidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(18px)", position: "sticky", top: 0, zIndex: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          {t("common.back")}
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT, color: T.text }}>{t("admin.companyConsoleTitle")}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, padding: "6px 10px", borderRadius: 999, background: T.accentSoft, border: `1px solid ${T.border}` }}>{company.name}</span>
        <div style={{ flex: 1 }} />
        <select
          value={mode}
          onChange={e => setMode(e.target.value as "system" | "light" | "dark")}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text }}
        >
          <option value="system">{t("theme.system")}</option>
          <option value="light">{t("theme.light")}</option>
          <option value="dark">{t("theme.dark")}</option>
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
              <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.companySettingsTitle")}</h2>
              {!featureFlags.logs_backups && (
                <p style={{ color: T.textSoft }}>{t("admin.logsBackupsDisabled")}</p>
              )}
              {featureFlags.logs_backups && (
                <div style={{ backgroundColor: T.bgSidebar, borderRadius: 16, border: `1px solid ${T.border}`, padding: 14, boxShadow: T.shadowSm }}>
                  <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>{t("settings.logsRetentionDays")}</label>
                  <input
                    type="number"
                    min={1}
                    value={companySettings?.log_retention_days ?? 30}
                    onChange={e => handleUpdateCompanySettings({ log_retention_days: Math.max(1, parseInt(e.target.value) || 1) })}
                    style={{ ...inputStyle, width: "100%", margin: "6px 0 12px" }}
                  />
                  <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>{t("settings.backupRetention")}</label>
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
                    {t("settings.backupEnabled")}
                  </label>
                </div>
              )}
            </div>
          )}

          {section === "usuarios" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.companyUsersTitle")}</h2>
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
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("admin.assignUserTitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder={t("settings.addMemberPlaceholder")} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
                  <select value={memberRole} onChange={e => setMemberRole(e.target.value as CompanyRole)} style={{ ...inputStyle, width: "auto" }}>
                    {["company_admin", "project_manager", "member", "viewer"].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <Btn variant="primary" onClick={handleAddMember}>{t("admin.assign")}</Btn>
                </div>
                {!!memberFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{memberFeedback}</p>}
              </div>
            </div>
          )}

          {section === "proyectos" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.projectsTitle")}</h2>
              {projects.map(project => (
                <div key={project.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{project.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{t("admin.projectPrefixLabel", { prefix: project.prefix })}</p>
                </div>
              ))}

              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginTop: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("admin.createProjectTitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={t("admin.projectNamePlaceholder")} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <input value={projectPrefix} onChange={e => setProjectPrefix(e.target.value)} placeholder={t("admin.projectPrefixPlaceholder")} style={{ ...inputStyle, width: 80, textAlign: "center" }} />
                  <Btn variant="primary" onClick={handleCreateProject}>{t("admin.createProject")}</Btn>
                </div>
                {!!projectFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{projectFeedback}</p>}
              </div>
            </div>
          )}

          {section === "tableros" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.boardsTitle")}</h2>
              {boards.map(board => (
                <div key={board.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{board.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{t("admin.boardIdLabel", { id: board.id })}</p>
                </div>
              ))}
            </div>
          )}

          {section === "trabajos" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.cardsTitle")}</h2>
              {cards.map(card => (
                <div key={card.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{card.card_id} - {card.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{t("admin.cardBoardLabel", { id: card.board_id })}</p>
                </div>
              ))}
            </div>
          )}

          {section === "mejoras" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.improvementsTitle")}</h2>
              {improvements.map(imp => (
                <div key={imp.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{imp.description}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    {t("admin.improvementLine", { status: imp.status, votes: imp.vote_count || 0, user: imp.user_name })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "logs" && featureFlags.logs_backups && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.logsTitle")}</h2>
              {logs.map(log => (
                <div key={log.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.text }}>{log.entity_type} · {log.change}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    {t("admin.logLine", { company: log.company_id, user: log.user_id, entity: log.entity_id })}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    {t("admin.logBoardLine", { board: log.board_id, date: new Date(log.created_at).toLocaleString(locale) })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "backups" && featureFlags.logs_backups && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.backupsTitle")}</h2>
              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginBottom: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("settings.backupManualTitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={backupSummary} onChange={e => setBackupSummary(e.target.value)} placeholder={t("settings.backupSummaryPlaceholder")} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                  <Btn variant="primary" onClick={handleCreateBackup}>{t("settings.backupCreate")}</Btn>
                </div>
                {!!backupFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{backupFeedback}</p>}
              </div>
              {backups.map(b => (
                <div key={b.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: T.text }}>{b.summary}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>
                    {new Date(b.created_at).toLocaleString(locale)} · {b.created_by}
                  </p>
                </div>
              ))}
            </div>
          )}

          {section === "funcionalidades" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.featuresTitle")}</h2>
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{t("settings.mandatory")}</span>
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









