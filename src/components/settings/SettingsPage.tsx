import { useState } from "react";
import { FONT, PHASE_COLORS, PHASE_META, HIDE_DONE_VALUES, SUPER_ADMIN_EMAIL } from "../../constants";
import { useTheme, useThemeMode } from "../../hooks/useTheme";
import { getUserFullName, uid } from "../../lib/utils";
import {
  saveBoard,
  saveColumn,
  saveState,
  deleteColumn,
  deleteState,
  loadProjectUsers,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from "../../lib/db";
import { Btn } from "../ui/Btn";
import { Toggle } from "../ui/Toggle";
import { Avatar } from "../ui/Avatar";
import { DragList } from "../ui/DragList";
import { ImprovementBtn } from "../ImprovementBtn";
import { useLang } from "../../i18n";
import type {
  Board, BoardColumn, BoardState, User,
  Company, CompanyBackup, CompanySettings, Project, ProjectMember, Feature, FeatureFlags, CompanyRole, ProjectRole,
} from "../../types";

interface SettingsPageProps {
  board: Board;
  project: Project | null;
  columns: BoardColumn[];
  states: BoardState[];
  projectMembers: ProjectMember[];
  currentUser: User;
  myRole: CompanyRole;
  myProjectRole: ProjectRole;
  company: Company;
  companySettings: CompanySettings | null;
  companyBackups: CompanyBackup[];
  featureFlags: FeatureFlags;
  featureCatalog: Feature[];
  activeProjectId: string | null;
  onBack: () => void;
  onUpdateBoard: (b: Board) => void;
  onUpdateColumns: (cols: BoardColumn[]) => void;
  onUpdateStates: (st: BoardState[]) => void;
  onUpdateProjectMembers: (members: ProjectMember[]) => void;
  onUpdateFeatureFlag: (key: string, enabled: boolean) => void;
  onUpdateCompanySettings: (settings: CompanySettings) => void;
  onCreateCompanyBackup: (summary: string) => Promise<void>;
}

export function SettingsPage({
  board, project, columns, states, projectMembers, currentUser, myRole, myProjectRole,
  company, companySettings, companyBackups,
  featureFlags, featureCatalog, activeProjectId,
  onBack, onUpdateBoard, onUpdateColumns, onUpdateStates,
  onUpdateProjectMembers, onUpdateFeatureFlag, onUpdateCompanySettings, onCreateCompanyBackup,
}: SettingsPageProps) {
  const T = useTheme();
  const { t, lang } = useLang();
  const { mode, setMode } = useThemeMode();
  const ROLE_LABELS: Record<ProjectRole, string> = {
    project_manager: t("roles.projectManager"),
    member: t("roles.member"),
    viewer: t("roles.viewer"),
  };
  const canManageProject = myRole === "company_admin" || myProjectRole === "project_manager";
  const canManageCompany = myRole === "company_admin";
  const showLogsBackups = featureFlags.logs_backups !== false;
  const [section, setSection] = useState(
    canManageCompany && showLogsBackups ? "empresa" : (activeProjectId ? "miembros" : "estados")
  );
  const [newStateName, setNewStateName] = useState("");
  const [newStatePhase, setNewStatePhase] = useState<"pre" | "work" | "post">("pre");
  const [newCatName, setNewCatName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<ProjectRole>("member");
  const [memberFeedback, setMemberFeedback] = useState("");
  const [memberUsers, setMemberUsers] = useState<User[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [companyBackupSummary, setCompanyBackupSummary] = useState("");
  const [companyBackupFeedback, setCompanyBackupFeedback] = useState("");


  const inp: React.CSSProperties = {
    fontFamily: FONT, fontSize: 13, borderRadius: 10,
    border: `1px solid ${T.border}`, padding: "9px 10px",
    backgroundColor: T.bgElevated, color: T.text, outline: "none", boxSizing: "border-box",
  };

  const sections = [
    ...(canManageCompany && showLogsBackups ? [{ id: "empresa", label: t("settings.section.company") }] : []),
    ...(activeProjectId ? [
      { id: "miembros", label: t("settings.section.members") },
      { id: "funcionalidades", label: t("settings.section.features") },
    ] : []),
    { id: "estados", label: t("settings.section.states") },
    { id: "columnas", label: t("settings.section.columns") },
    ...(featureFlags.categories !== false ? [{ id: "categorias", label: t("settings.section.categories") }] : []),
    { id: "campos", label: t("settings.section.fields") },
    { id: "acceso", label: t("settings.section.access") },
  ];

  const OPT_FIELDS = [
    ...(featureFlags.card_types !== false ? [{ id: "tipo", label: t("card.type") }] : []),
    ...(featureFlags.categories !== false ? [{ id: "categoria", label: t("card.category") }] : []),
    { id: "dueDate", label: t("card.dueDate") },
    { id: "bloqueado", label: t("card.blocked") },
    ...(featureFlags.dependencies !== false ? [{ id: "dependencias", label: t("card.dependencies") }] : []),
    { id: "comentarios", label: t("card.tabs.comments") },
    { id: "archivos", label: t("card.tabs.files") },
    { id: "tiempos", label: t("card.tabs.times") },
  ];

  const hideDoneOptions = HIDE_DONE_VALUES.map(value => ({
    value,
    label: value === 0 ? t("settings.hideDoneNever") : t("settings.hideDoneAfter", { days: value }),
  }));

  const assignedStateIds = new Set(columns.flatMap(c => c.state_ids || []));
  const unassigned = states.filter(s => !assignedStateIds.has(s.id));

  // Load project member user details when entering the members section
  async function ensureMemberUsers() {
    if (membersLoaded || !activeProjectId) return;
    const users = await loadProjectUsers(activeProjectId);
    setMemberUsers(users);
    setMembersLoaded(true);
  }

  async function handleAddMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email || !email.includes("@") || !activeProjectId) {
      setMemberFeedback(t("settings.memberEmailInvalid"));
      return;
    }
    // Look up user by email
    const { supabase } = await import("../../lib/supabase");
    const { data: userRow } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
    if (!userRow) {
      setMemberFeedback(t("settings.memberNotFound"));
      return;
    }
    const user = userRow as User;
    await addProjectMember(activeProjectId, user.id, memberRole, currentUser.id);
    const newMember: ProjectMember = { id: uid(), project_id: activeProjectId, user_id: user.id, role: memberRole, assigned_by: currentUser.id };
    onUpdateProjectMembers([...projectMembers, newMember]);
    setMemberUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user]);
    setMemberEmail("");
    setMemberFeedback(t("settings.memberAdded", { name: getUserFullName(user) || user.name, role: ROLE_LABELS[memberRole] }));
  }

  async function handleRemoveMember(userId: string) {
    if (!activeProjectId) return;
    await removeProjectMember(activeProjectId, userId);
    onUpdateProjectMembers(projectMembers.filter(m => m.user_id !== userId));
  }

  async function handleChangeRole(userId: string, role: ProjectRole) {
    if (!activeProjectId) return;
    await updateProjectMemberRole(activeProjectId, userId, role);
    onUpdateProjectMembers(projectMembers.map(m => m.user_id === userId ? { ...m, role } : m));
  }

  async function handleFeatureToggle(key: string, enabled: boolean) {
    if (!canManageCompany) return;
    onUpdateFeatureFlag(key, enabled);
  }

  async function addState() {
    if (!newStateName.trim()) return;
    const ns: BoardState = { id: uid(), board_id: board.id, name: newStateName.trim(), phase: newStatePhase, is_discard: false, sort_order: states.length };
    await saveState(ns, currentUser.id);
    onUpdateStates([...states, ns]);
    setNewStateName("");
  }

  async function removeStateItem(id: string) { await deleteState(id, currentUser.id); onUpdateStates(states.filter(s => s.id !== id)); }
  async function updateStatePhase(id: string, phase: "pre" | "work" | "post") {
    const updated = states.map(s => s.id === id ? { ...s, phase } : s);
    await saveState(updated.find(s => s.id === id)!, currentUser.id);
    onUpdateStates(updated);
  }
  async function reorderStates(newStates: BoardState[]) {
    const reindexed = newStates.map((s, i) => ({ ...s, sort_order: i }));
    await Promise.all(reindexed.map(state => saveState(state, currentUser.id)));
    onUpdateStates(reindexed);
  }

  async function addColumn() {
    const nc: BoardColumn = { id: uid(), board_id: board.id, name: t("settings.addColumnName"), phase: "pre", state_ids: [], wip_limit: 0, is_wip: false, sort_order: columns.length };
    await saveColumn(nc, currentUser.id); onUpdateColumns([...columns, nc]);
  }
  async function removeCol(id: string) { await deleteColumn(id, currentUser.id); onUpdateColumns(columns.filter(c => c.id !== id)); }
  async function updateCol(id: string, partial: Partial<BoardColumn>) {
    const updated = columns.map(c => c.id === id ? { ...c, ...partial } : c);
    await saveColumn(updated.find(c => c.id === id)!, currentUser.id);
    onUpdateColumns(updated);
  }
  async function reorderCols(newCols: BoardColumn[]) {
    const reindexed = newCols.map((c, i) => ({ ...c, sort_order: i }));
    await Promise.all(reindexed.map(col => saveColumn(col, currentUser.id)));
    onUpdateColumns(reindexed);
  }

  async function addCat() {
    if (!newCatName.trim() || board.categories.includes(newCatName.trim())) return;
    const updated = { ...board, categories: [...board.categories, newCatName.trim()] };
    await saveBoard(updated, currentUser.id); onUpdateBoard(updated); setNewCatName("");
  }
  async function removeCat(cat: string) {
    const updated = { ...board, categories: board.categories.filter(c => c !== cat) };
    await saveBoard(updated, currentUser.id); onUpdateBoard(updated);
  }
  async function reorderCats(cats: string[]) {
    const updated = { ...board, categories: cats };
    await saveBoard(updated, currentUser.id); onUpdateBoard(updated);
  }

  async function toggleField(fid: string, on: boolean) {
    const updated = { ...board, visible_fields: on ? [...board.visible_fields, fid] : board.visible_fields.filter(x => x !== fid) };
    await saveBoard(updated, currentUser.id); onUpdateBoard(updated);
  }
  async function updateBoardConfig(partial: Partial<Board["board_config"]>) {
    const updated = { ...board, board_config: { ...board.board_config, ...partial } };
    await saveBoard(updated, currentUser.id); onUpdateBoard(updated);
  }

  function updateCompanySettings(partial: Partial<CompanySettings>) {
    if (!showLogsBackups) return;
    const base: CompanySettings = companySettings || {
      company_id: company.id,
      log_retention_days: 30,
      backup_retention_count: 10,
      backup_enabled: true,
      updated_at: new Date().toISOString(),
    };
    const updated = { ...base, ...partial, updated_at: new Date().toISOString() };
    onUpdateCompanySettings(updated);
  }

  async function handleCreateBackup() {
    if (!canManageCompany) return;
    if (!showLogsBackups) return;
    const summary = companyBackupSummary.trim() || t("settings.backupManualDefault");
    await onCreateCompanyBackup(summary);
    setCompanyBackupSummary("");
    setCompanyBackupFeedback(t("settings.backupGenerated"));
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh", position: "relative" }}>
      <div style={{ backgroundColor: T.bgSidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(18px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          ← {t("common.back")}
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text, flex: 1 }}>
          {t("settings.title")} — {project ? `${project.name} / ` : ""}{board.title}
        </span>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as "system" | "light" | "dark")}
          style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text }}
        >
          <option value="system">{t("theme.system")}</option>
          <option value="light">{t("theme.light")}</option>
          <option value="dark">{t("theme.dark")}</option>
        </select>
        {currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL && (
          <a
            href="/admin.html"
            style={{ fontSize: 11, fontWeight: 700, color: T.danger, border: `1px solid ${T.danger}`, padding: "6px 10px", borderRadius: 999, textDecoration: "none", marginRight: 8 }}
          >
            {t("menu.openAdminConsole")}
          </a>
        )}
        {featureFlags.improvements && (
          <ImprovementBtn companyId={company.id} boardId={board.id} userId={currentUser.id} userName={currentUser.name} context="configuracion" />
        )}
      </div>

      <div style={{ padding: "10px 22px 0", fontSize: 11, color: T.textSoft, fontFamily: FONT }}>
        {t("settings.languageNote")}
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar */}
        <div style={{ width: 205, backgroundColor: T.bgSidebar, borderRight: `1px solid ${T.border}`, padding: "13px 9px", flexShrink: 0 }}>
          {sections.map(s => (
            <button key={s.id} onClick={() => { setSection(s.id); if (s.id === "miembros") ensureMemberUsers(); }}
              style={{ width: "100%", textAlign: "left", fontFamily: FONT, fontSize: 13, fontWeight: section === s.id ? 700 : 500, padding: "9px 13px", borderRadius: 10, border: "none", backgroundColor: section === s.id ? T.accentSoft : "transparent", color: section === s.id ? T.accent : T.textSoft, cursor: "pointer", marginBottom: 3, display: "block" }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: "22px 26px", overflowY: "auto" }}>

          {/* Empresa */}
          {section === "empresa" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>
                {t("settings.companyTitle", { name: company.name })}
              </h2>

              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>{t("settings.logsRetentionDays")}</label>
                <input
                  type="number"
                  min={1}
                  value={companySettings?.log_retention_days ?? 30}
                  onChange={e => updateCompanySettings({ log_retention_days: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ ...inp, width: "100%", margin: "6px 0 12px" }}
                />
                <label style={{ fontSize: 12, color: T.textSoft, fontWeight: 600 }}>{t("settings.backupRetention")}</label>
                <input
                  type="number"
                  min={1}
                  value={companySettings?.backup_retention_count ?? 10}
                  onChange={e => updateCompanySettings({ backup_retention_count: Math.max(1, parseInt(e.target.value) || 1) })}
                  style={{ ...inp, width: "100%", margin: "6px 0 12px" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: T.text }}>
                  <input
                    type="checkbox"
                    checked={companySettings?.backup_enabled ?? true}
                    onChange={e => updateCompanySettings({ backup_enabled: e.target.checked })}
                  />
                  {t("settings.backupEnabled")}
                </label>
              </div>

              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginBottom: 16 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>{t("settings.backupManualTitle")}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    value={companyBackupSummary}
                    onChange={e => setCompanyBackupSummary(e.target.value)}
                    placeholder={t("settings.backupSummaryPlaceholder")}
                    style={{ ...inp, flex: 1, minWidth: 160 }}
                  />
                  <Btn variant="primary" onClick={handleCreateBackup}>{t("settings.backupCreate")}</Btn>
                </div>
                {!!companyBackupFeedback && (
                  <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success }}>{companyBackupFeedback}</p>
                )}
              </div>

              <div>
                <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>
                  {t("settings.backupsAvailable", { count: companyBackups.length })}
                </h3>
                {companyBackups.length === 0 && (
                  <p style={{ fontSize: 12, color: T.textSoft, fontFamily: FONT }}>{t("settings.backupsNone")}</p>
                )}
                {companyBackups.map(b => (
                  <div key={b.id} style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: "9px 13px", marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontFamily: FONT, color: T.text }}>{b.summary}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                      {new Date(b.created_at).toLocaleString(lang === "es" ? "es-ES" : "en-US")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Miembros */}
          {section === "miembros" && activeProjectId && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>
                {project ? t("settings.projectMembersTitle", { name: project.name }) : t("settings.projectMembersTitleFallback")}
              </h2>

              {projectMembers.length === 0 && (
                <p style={{ fontSize: 13, color: T.textSoft, fontFamily: FONT, fontStyle: "italic" }}>{t("settings.projectMembersEmpty")}</p>
              )}

              {projectMembers.map(member => {
                const user = memberUsers.find(u => u.id === member.user_id);
                return (
                  <div key={member.id} style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                    {user && <Avatar user={user} size={36} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{user?.name || member.user_id}</p>
                      <p style={{ margin: 0, fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{user?.email || ""}</p>
                    </div>
                    {canManageProject ? (
                      <select value={member.role} onChange={e => handleChangeRole(member.user_id, e.target.value as ProjectRole)}
                        style={{ ...inp, fontSize: 12, padding: "3px 7px", width: "auto" }}>
                        {(Object.keys(ROLE_LABELS) as ProjectRole[]).map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: FONT, background: T.accentSoft, color: T.accent, border: `1px solid ${T.accent}44` }}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                    {canManageProject && member.user_id !== currentUser.id && (
                      <Btn variant="danger" onClick={() => handleRemoveMember(member.user_id)} style={{ fontSize: 11, padding: "4px 9px" }}>{t("settings.remove")}</Btn>
                    )}
                  </div>
                );
              })}

              {canManageProject && (
                <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: 14, marginTop: 14 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.addMemberTitle")}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={memberEmail} onChange={e => setMemberEmail(e.target.value)}
                      placeholder={t("settings.addMemberPlaceholder")} style={{ ...inp, flex: 1, minWidth: 160 }} />
                    <select value={memberRole} onChange={e => setMemberRole(e.target.value as ProjectRole)}
                      style={{ ...inp, width: "auto" }}>
                      {(Object.keys(ROLE_LABELS) as ProjectRole[]).map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                    <Btn variant="primary" onClick={handleAddMember}>{t("settings.addMemberButton")}</Btn>
                  </div>
                  {!!memberFeedback && (
                    <p style={{ margin: "7px 0 0", fontSize: 11, color: T.success, fontFamily: FONT }}>{memberFeedback}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Funcionalidades */}
          {section === "funcionalidades" && activeProjectId && (
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.featuresTitle")}</h2>
              <p style={{ margin: "0 0 18px", fontSize: 12, color: T.textSoft, fontFamily: FONT }}>
                {t("settings.featuresHint")}
              </p>

              {featureCatalog.length === 0 && (
                // Fallback cuando no se ha cargado el catálogo: mostrar las flags actuales
                Object.entries(featureFlags).map(([key, enabled]) => (
                  <div key={key} style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                    <Toggle on={enabled} onChange={v => canManageCompany && handleFeatureToggle(key, v)} />
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: T.text, flex: 1, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                  </div>
                ))
              )}

              {featureCatalog.map(feature => {
                const isOn = featureFlags[feature.key] ?? feature.default_on;
                return (
                  <div key={feature.key} style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${feature.is_mandatory ? `${T.accent}44` : T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                    <Toggle on={isOn} onChange={v => canManageCompany && !feature.is_mandatory && handleFeatureToggle(feature.key, v)} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, fontFamily: FONT, color: T.text }}>{feature.label}</p>
                      {feature.description && <p style={{ margin: "2px 0 0", fontSize: 11, color: T.textSoft, fontFamily: FONT }}>{feature.description}</p>}
                    </div>
                    {feature.is_mandatory && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentSoft, borderRadius: 20, padding: "2px 8px", border: `1px solid ${T.accent}33` }}>
                        {t("settings.mandatory")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Estados */}
          {section === "estados" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.statesTitle")}</h2>
              {(["pre", "work", "post"] as const).map(phase => {
                const pm = PHASE_META[phase];
                const phaseStates = states.filter(s => s.phase === phase);
                return (
                  <div key={phase} style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: pm.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: pm.color }}>{t(pm.labelKey)}</span>
                      <div style={{ flex: 1, height: 1, background: `${pm.color}33` }} />
                      <span style={{ fontSize: 11, color: T.textSoft, fontFamily: FONT }}>
                        {t("settings.statesCount", { count: phaseStates.length })}
                      </span>
                    </div>
                    {!phaseStates.length && <p style={{ fontSize: 12, color: T.textSoft, fontFamily: FONT, fontStyle: "italic", marginLeft: 20 }}>{t("settings.statesEmpty")}</p>}
                    <DragList items={phaseStates} keyFn={s => s.id} onReorder={reordered => reorderStates([...states.filter(s => s.phase !== phase), ...reordered])} renderItem={s => (
                      <div style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${pm.color}44`, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, marginLeft: 20 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: pm.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, flex: 1, color: T.text }}>{s.name}</span>
                        <select value={s.phase} onChange={e => updateStatePhase(s.id, e.target.value as "pre" | "work" | "post")} style={{ ...inp, width: "auto", fontSize: 11, padding: "3px 7px" }}>
                          {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
                        </select>
                        <Btn variant="danger" onClick={() => removeStateItem(s.id)} style={{ fontSize: 11, padding: "3px 8px" }}>×</Btn>
                      </div>
                    )} />
                  </div>
                );
              })}
              <div style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: 13, marginTop: 6 }}>
                <p style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.addStateTitle")}</p>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <input value={newStateName} onChange={e => setNewStateName(e.target.value)} placeholder={t("settings.addStatePlaceholder")} style={{ ...inp, flex: 1, minWidth: 100 }} />
                  <select value={newStatePhase} onChange={e => setNewStatePhase(e.target.value as "pre" | "work" | "post")} style={{ ...inp, width: "auto" }}>
                    {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
                  </select>
                  <Btn variant="primary" onClick={addState}>{t("settings.add")}</Btn>
                </div>
              </div>
            </div>
          )}

          {/* Columnas */}
          {section === "columnas" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.columnsTitle")}</h2>
                <Btn variant="primary" onClick={addColumn}>{t("settings.addColumn")}</Btn>
              </div>
              {unassigned.length > 0 && (
                <div style={{ backgroundColor: "#FAEEDA", border: "1.5px solid #EF9F27", borderRadius: 11, padding: "10px 14px", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#633806", fontFamily: FONT }}>{t("settings.unassignedStates")} </span>
                  <span style={{ fontSize: 12, color: "#633806", fontFamily: FONT }}>{unassigned.map(s => s.name).join(", ")}</span>
                </div>
              )}
              <DragList items={columns} keyFn={c => c.id} onReorder={reorderCols} renderItem={c => {
                const cc = PHASE_COLORS[c.phase] || "#888";
                return (
                  <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `2px solid ${cc}55`, overflow: "hidden", marginBottom: 10, cursor: "grab" }}>
                    <div style={{ background: cc, padding: "8px 13px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>≡</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: FONT, flex: 1 }}>{c.name}</span>
                      <select value={c.phase} onChange={e => updateCol(c.id, { phase: e.target.value as "pre" | "work" | "post" })}
                        style={{ fontSize: 11, borderRadius: 7, border: "none", padding: "2px 6px", backgroundColor: "rgba(255,255,255,0.2)", color: "#fff", fontFamily: FONT, cursor: "pointer", outline: "none" }}>
                        {Object.entries(PHASE_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
                      </select>
                    </div>
                    <div style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 3 }}>{t("settings.nameLabel")}</label>
                          <input value={c.name} onChange={e => updateCol(c.id, { name: e.target.value })} style={{ ...inp, width: "100%" }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 3 }}>{t("settings.wipLimit")}</label>
                          <input type="number" min={0} value={c.wip_limit || 0}
                            onChange={e => updateCol(c.id, { wip_limit: Math.max(0, parseInt(e.target.value) || 0) })}
                            style={{ ...inp, width: 65, textAlign: "center" }} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, display: "block", marginBottom: 5 }}>{t("settings.assignedStates")}</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {states.map(s => {
                            const assigned = (c.state_ids || []).includes(s.id);
                            const pm = PHASE_META[s.phase] || PHASE_META.pre;
                            return (
                              <span key={s.id} onClick={() => updateCol(c.id, { state_ids: assigned ? c.state_ids.filter(id => id !== s.id) : [...(c.state_ids || []), s.id] })}
                                style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT, padding: "3px 10px", borderRadius: 20, cursor: "pointer", background: assigned ? `${pm.color}22` : T.bgSoft, color: assigned ? pm.color : T.textSoft, border: `1.5px solid ${assigned ? `${pm.color}55` : T.border}` }}>
                                {s.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontFamily: FONT, color: T.text, fontWeight: 600 }}>
                          <input type="checkbox" checked={!!c.is_wip} onChange={e => updateCol(c.id, { is_wip: e.target.checked })} />
                          {t("settings.isWip")}
                        </label>
                        {columns.length > 1 && (
                          <Btn variant="danger" onClick={() => removeCol(c.id)} style={{ fontSize: 11, padding: "3px 9px" }}>{t("settings.remove")}</Btn>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }} />
            </div>
          )}

          {/* Categorias */}
          {section === "categorias" && (
            <div>
              <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.categoriesTitle")}</h2>
              <DragList items={board.categories} keyFn={c => c} onReorder={reorderCats} renderItem={c => (
                <div style={{ backgroundColor: T.bg, borderRadius: 10, border: `1.5px solid ${T.border}`, padding: "9px 13px", display: "flex", alignItems: "center", gap: 9, marginBottom: 6, cursor: "grab" }}>
                  <span style={{ fontSize: 14, color: T.textSoft }}>≡</span>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: FONT, color: T.text }}>{c}</span>
                  <Btn variant="danger" onClick={() => removeCat(c)} style={{ fontSize: 11, padding: "3px 8px" }}>×</Btn>
                </div>
              )} />
              <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder={t("settings.addCategoryPlaceholder")} style={{ ...inp, flex: 1 }} />
                <Btn variant="primary" onClick={addCat}>{t("settings.add")}</Btn>
              </div>
            </div>
          )}

          {/* Campos */}
          {section === "campos" && (
            <div>
              <h2 style={{ margin: "0 0 5px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.modalFieldsTitle")}</h2>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: T.textSoft, fontFamily: FONT }}>{t("settings.fieldsAlwaysVisible")}</p>
              {OPT_FIELDS.map(f => (
                <div key={f.id} style={{ backgroundColor: T.bg, borderRadius: 11, border: `1.5px solid ${T.border}`, padding: "11px 15px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
                  <Toggle on={(board.visible_fields || []).includes(f.id)} onChange={v => toggleField(f.id, v)} />
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: T.text }}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acceso */}
          {section === "acceso" && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.accessTitle")}</h2>
              {([
                { key: "public" as const, label: t("settings.accessPublicLabel"), desc: t("settings.accessPublicDesc") },
                { key: "requireLogin" as const, label: t("settings.accessRequireLabel"), desc: t("settings.accessRequireDesc") },
              ]).map(opt => (
                <div key={opt.key} onClick={() => updateBoardConfig({ [opt.key]: !board.board_config?.[opt.key] })}
                  style={{ backgroundColor: T.bg, borderRadius: 13, border: `2px solid ${board.board_config?.[opt.key] ? T.accent : T.border}`, padding: "13px 15px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
                  <Toggle on={!!board.board_config?.[opt.key]} onChange={() => {}} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: FONT, color: board.board_config?.[opt.key] ? T.accent : T.text }}>{opt.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, fontFamily: FONT, color: T.textSoft }}>{opt.desc}</p>
                  </div>
                </div>
              ))}
              <div style={{ backgroundColor: T.bg, borderRadius: 13, border: `1.5px solid ${T.border}`, padding: "13px 15px", marginTop: 4 }}>
                <p style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 700, fontFamily: FONT, color: T.text }}>{t("settings.hideDone")}</p>
                <select value={board.board_config?.hideDoneAfterDays || 0}
                  onChange={e => updateBoardConfig({ hideDoneAfterDays: parseInt(e.target.value) || 0 })}
                  style={{ fontFamily: FONT, fontSize: 13, borderRadius: 8, border: `1.5px solid ${T.border}`, padding: "8px 10px", backgroundColor: T.bgSoft, color: T.text, outline: "none", width: "100%" }}>
                  {hideDoneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}



