import { useEffect, useMemo, useState } from "react";
import { ADMIN_DOCS_URL, FONT, SUPER_ADMIN_EMAIL } from "../constants";
import { useTheme, useThemeMode } from "../hooks/useTheme";
import { useLang } from "../i18n";
import {
  assignUserToCompany,
  createCompany,
  createCompanyBackup,
  createProject,
  getOrCreateWorkspace,
  loadAllCompanies,
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
  markImprovementsAiPending,
  saveCompanySettings,
  setCompanyFeature,
  updateCompany,
  updateFeatureCatalog,
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
  Project,
  Board,
  Card,
  Improvement,
  BoardLog,
  User,
} from "../types";

type AdminSection =
  | "empresas"
  | "usuarios"
  | "proyectos"
  | "tableros"
  | "trabajos"
  | "mejoras"
  | "logs"
  | "backups"
  | "funcionalidades";

interface AdminConsolePageProps {
  currentUser: User;
  onBack: () => void;
}

export function AdminConsolePage({ currentUser, onBack }: AdminConsolePageProps) {
  const T = useTheme();
  const { t, lang } = useLang();
  const locale = lang === "es" ? "es-ES" : "en-US";
  const { mode, setMode } = useThemeMode();
  const adminDocsUrl = ADMIN_DOCS_URL;
  const [section, setSection] = useState<AdminSection>("empresas");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newCompanyCode, setNewCompanyCode] = useState("");
  const [newCompanyFeedback, setNewCompanyFeedback] = useState("");

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<CompanyRole>("member");
  const [memberFeedback, setMemberFeedback] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectPrefix, setProjectPrefix] = useState("");
  const [projectFeedback, setProjectFeedback] = useState("");

  const [backupSummary, setBackupSummary] = useState("");
  const [backupFeedback, setBackupFeedback] = useState("");

  const isSuperAdmin = currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL;

  const sections: { id: AdminSection; label: string }[] = [
    { id: "empresas", label: t("admin.section.companies") },
    { id: "usuarios", label: t("admin.section.users") },
    { id: "proyectos", label: t("admin.section.projects") },
    { id: "tableros", label: t("admin.section.boards") },
    { id: "trabajos", label: t("admin.section.cards") },
    { id: "mejoras", label: t("admin.section.improvements") },
    { id: "logs", label: t("admin.section.logs") },
    { id: "backups", label: t("admin.section.backups") },
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
    Promise.all([loadAllCompanies(), loadFeatureCatalog()]).then(([cos, features]) => {
      if (cancelled) return;
      setCompanies(cos);
      setFeatureCatalog(features);
      setSelectedCompany(cos[0] || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    let cancelled = false;
    Promise.all([
      loadCompanyMembers(selectedCompany.id),
      loadAllCompanyProjects(selectedCompany.id),
      loadCompanyBoards(selectedCompany.id),
      loadCompanyCards(selectedCompany.id),
      loadCompanyImprovements(selectedCompany.id),
      loadCompanyLogs(selectedCompany.id),
      loadCompanyBackups(selectedCompany.id),
      loadCompanySettings(selectedCompany.id),
      loadCompanyFeatures(selectedCompany.id),
    ]).then(([mems, projs, brds, cds, imps, logsData, backupsData, settings, features]) => {
      if (cancelled) return;
      setMembers(mems);
      setProjects(projs);
      setBoards(brds);
      setCards(cds);
      setImprovements(imps);
      setLogs(logsData);
      setBackups(backupsData);
      setCompanySettings(settings);
      setCompanyFeatures(features);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id]);

  async function handleCreateCompany() {
    const name = newCompanyName.trim();
    const email = newCompanyEmail.trim().toLowerCase();
    if (!name || !email.includes("@")) {
      setNewCompanyFeedback(t("admin.companyCreateMissing"));
      return;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { data: ownerRow } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    const ownerId = (ownerRow as { id?: string } | null)?.id || currentUser.id;
    const company = await createCompany(name, slug, email, currentUser.id, ownerId, newCompanyCode.trim() || null);
    setCompanies(prev => [...prev, company]);
    setSelectedCompany(company);
    setNewCompanyName("");
    setNewCompanyEmail("");
    setNewCompanyCode("");
    setNewCompanyFeedback(t("admin.companyCreated", { name }));
  }

  async function handleToggleCompanyActive(company: Company) {
    const updated = { ...company, is_active: !company.is_active };
    await updateCompany(updated);
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selectedCompany?.id === updated.id) setSelectedCompany(updated);
  }

  async function handleAddMember() {
    if (!selectedCompany) return;
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
    await assignUserToCompany(selectedCompany.id, (userRow as User).id, memberRole, currentUser.id);
    const updated = await loadCompanyMembers(selectedCompany.id);
    setMembers(updated);
    setMemberEmail("");
    setMemberFeedback(t("admin.memberAssigned", { role: memberRole }));
  }

  async function handleCreateProject() {
    if (!selectedCompany) return;
    const name = projectName.trim();
    const prefix = projectPrefix.trim().toUpperCase();
    if (!name || !prefix) {
      setProjectFeedback(t("admin.projectRequired"));
      return;
    }
    const workspace = await getOrCreateWorkspace(selectedCompany.id, currentUser.id);
    await createProject(workspace.id, name, prefix, currentUser.id);
    const projs = await loadAllCompanyProjects(selectedCompany.id);
    setProjects(projs);
    setProjectName("");
    setProjectPrefix("");
    setProjectFeedback(t("admin.projectCreated"));
  }

  async function handleUpdateCompanySettings(partial: Partial<CompanySettings>) {
    if (!selectedCompany) return;
    const base: CompanySettings = companySettings || {
      company_id: selectedCompany.id,
      log_retention_days: 30,
      backup_retention_count: 10,
      backup_enabled: true,
      updated_at: new Date().toISOString(),
    };
    const updated = { ...base, ...partial, updated_at: new Date().toISOString() };
    await saveCompanySettings(updated);
    setCompanySettings(updated);
  }

  async function handleCreateBackup() {
    if (!selectedCompany) return;
    const summary = backupSummary.trim() || t("settings.backupManualDefault");
    await createCompanyBackup(selectedCompany.id, currentUser.id, summary);
    const refreshed = await loadCompanyBackups(selectedCompany.id);
    setBackups(refreshed);
    setBackupSummary("");
    setBackupFeedback(t("settings.backupGenerated"));
  }

  async function handleCompanyFeatureToggle(featureKey: string, enabled: boolean) {
    if (!selectedCompany) return;
    await setCompanyFeature(selectedCompany.id, featureKey, enabled, currentUser.id);
    const updated = await loadCompanyFeatures(selectedCompany.id);
    setCompanyFeatures(updated);
  }

  async function handleCatalogUpdate(feature: Feature, field: "default_on" | "is_mandatory", value: boolean) {
    const updated = { ...feature, [field]: value };
    await updateFeatureCatalog(updated);
    setFeatureCatalog(prev => prev.map(f => f.id === updated.id ? updated : f));
  }

  async function handleApproveImprovement(improvementId: string) {
    await markImprovementsAiPending([improvementId]);
    setImprovements(prev => prev.map(imp => imp.id === improvementId ? { ...imp, status: "ai_pending" } : imp));
  }

  const companyFeatureMap = useMemo(() => new Map(companyFeatures.map(f => [f.feature_key, f.is_enabled])), [companyFeatures]);

  if (!isSuperAdmin) {
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
        <span style={{ fontSize: 15, fontWeight: 800, fontFamily: FONT, color: T.text }}>{t("admin.consoleTitle")}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.danger, padding: "6px 10px", borderRadius: 999, background: T.dangerSoft, border: `1px solid ${T.border}` }}>{t("admin.superAdminBadge")}</span>
        {selectedCompany && (
          <span style={{ fontSize: 12, color: T.textSoft }}>{selectedCompany.name}</span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.open(adminDocsUrl, "_blank", "noopener,noreferrer")}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, borderRadius: 12, padding: "10px 12px", border: `1px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}
        >
          {t("menu.docs")}
        </button>
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
              style={{ width: "100%", textAlign: "left", fontFamily: FONT, fontSize: 13, fontWeight: section === s.id ? 700 : 500, padding: "10px 13px", borderRadius: 12, border: `1px solid ${section === s.id ? T.danger : "transparent"}`, backgroundColor: section === s.id ? T.dangerSoft : "transparent", color: section === s.id ? T.danger : T.textSoft, cursor: "pointer", marginBottom: 5, display: "block" }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
          {section === "empresas" && (
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.companiesTitle", { count: companies.length })}</h2>
                {companies.map(company => (
                  <div key={company.id}
                    onClick={() => setSelectedCompany(company)}
                    style={{ backgroundColor: T.bgSidebar, borderRadius: 16, border: `1px solid ${selectedCompany?.id === company.id ? T.danger : T.border}`, padding: "12px 15px", marginBottom: 8, cursor: "pointer", boxShadow: selectedCompany?.id === company.id ? T.shadowSm : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{company.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{company.contact_email}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: company.is_active ? T.successSoft : T.dangerSoft, color: company.is_active ? T.success : T.danger, border: `1px solid ${company.is_active ? `${T.success}33` : `${T.danger}33`}` }}>
                        {company.is_active ? t("admin.companyActive") : t("admin.companyInactive")}
                      </span>
                      <Btn variant={company.is_active ? "danger" : "primary"}
                        onClick={() => { void handleToggleCompanyActive(company); }}
                        style={{ fontSize: 11, padding: "3px 8px" }}>
                        {company.is_active ? t("admin.companyDeactivate") : t("admin.companyActivate")}
                      </Btn>
                    </div>
                  </div>
                ))}

                <div style={{ backgroundColor: T.bgSidebar, borderRadius: 16, border: `1px solid ${T.border}`, padding: 15, marginTop: 16, boxShadow: T.shadowSm }}>
                  <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("admin.newCompanyTitle")}</p>
                  <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                    placeholder={t("admin.companyNamePlaceholder")} style={{ ...inputStyle, width: "100%", marginBottom: 7 }} />
                  <input value={newCompanyEmail} onChange={e => setNewCompanyEmail(e.target.value)}
                    placeholder={t("admin.companyEmailPlaceholder")} style={{ ...inputStyle, width: "100%", marginBottom: 7 }} />
                  <input value={newCompanyCode} onChange={e => setNewCompanyCode(e.target.value)}
                    placeholder={t("admin.companyCodePlaceholder")} style={{ ...inputStyle, width: "100%", marginBottom: 10 }} />
                  <Btn variant="primary" onClick={handleCreateCompany}>{t("admin.createCompany")}</Btn>
                  {!!newCompanyFeedback && (
                    <p style={{ margin: "8px 0 0", fontSize: 11, color: T.success }}>{newCompanyFeedback}</p>
                  )}
                </div>
              </div>

              {selectedCompany && (
                <div style={{ flex: 1, minWidth: 280 }}>
                  <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.companySettingsTitle")}</h2>
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
                </div>
              )}
            </div>
          )}

          {section === "usuarios" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.companyUsersTitle")}</h2>
              {!selectedCompany && <p style={{ color: T.textSoft }}>{t("admin.selectCompany")}</p>}
              {selectedCompany && (
                <>
                  {members.map(m => (
                    <div key={m.id} style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{m.user?.name || m.user_id}</p>
                        <p style={{ margin: 0, fontSize: 11, color: T.textSoft }}>{m.user?.email || ""}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#7F77DD" }}>{m.role}</span>
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
                    {!!memberFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: "#1D9E75" }}>{memberFeedback}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {section === "proyectos" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.projectsTitle")}</h2>
              {!selectedCompany && <p style={{ color: T.textSoft }}>{t("admin.selectCompany")}</p>}
              {selectedCompany && (
                <>
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
                    {!!projectFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: "#1D9E75" }}>{projectFeedback}</p>}
                  </div>
                </>
              )}
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
                  {selectedCompany && (
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: T.textSoft }}>
                      {t("admin.companyLine", { name: selectedCompany.name })}
                    </p>
                  )}
                  {imp.status === "pending" && (
                    <div style={{ marginTop: 8 }}>
                      <Btn variant="primary" onClick={() => handleApproveImprovement(imp.id)} style={{ fontSize: 11, padding: "4px 10px" }}>
                        {t("admin.approveForAi")}
                      </Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {section === "logs" && (
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

          {section === "backups" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>{t("admin.backupsTitle")}</h2>
              {selectedCompany && (
                <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginBottom: 16 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("settings.backupManualTitle")}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={backupSummary} onChange={e => setBackupSummary(e.target.value)} placeholder={t("settings.backupSummaryPlaceholder")} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
                    <Btn variant="primary" onClick={handleCreateBackup}>{t("settings.backupCreate")}</Btn>
                  </div>
                  {!!backupFeedback && <p style={{ margin: "7px 0 0", fontSize: 11, color: "#1D9E75" }}>{backupFeedback}</p>}
                </div>
              )}
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
                const override = selectedCompany ? companyFeatureMap.get(feature.key) : undefined;
                const effective = feature.is_mandatory ? true : (override ?? feature.default_on);
                return (
                  <div key={feature.id} style={{ backgroundColor: T.bg, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 14px", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text }}>{feature.label}</p>
                        {feature.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft }}>{feature.description}</p>}
                      </div>
                      <label style={{ fontSize: 11, color: T.textSoft }}>
                        {t("admin.featureDefault")}
                        <input type="checkbox" checked={feature.default_on}
                          onChange={e => handleCatalogUpdate(feature, "default_on", e.target.checked)} />
                      </label>
                      <label style={{ fontSize: 11, color: T.textSoft }}>
                        {t("admin.featureMandatory")}
                        <input type="checkbox" checked={feature.is_mandatory}
                          onChange={e => handleCatalogUpdate(feature, "is_mandatory", e.target.checked)} />
                      </label>
                      {selectedCompany && !feature.is_mandatory && (
                        <label style={{ fontSize: 11, color: T.textSoft }}>
                          {t("admin.featureCompany")}
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

