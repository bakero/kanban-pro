import type { User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { DEFAULT_VISIBLE, SUPER_ADMIN_EMAIL } from "../constants";
import { histEntry, nameInitials, strColor, uid } from "./utils";
import type {
  User,
  Company,
  CompanyMember,
  CompanyInvite,
  Workspace,
  Project,
  ProjectMember,
  Feature,
  CompanyFeature,
  ProjectFeature,
  FeatureFlags,
  Board,
  BoardState,
  BoardColumn,
  Card,
  BoardLog,
  CompanyAdminLog,
  Improvement,
  ImprovementVote,
  BoardInvite,
  AppData,
  AdminConsoleData,
  AdminBoardSummary,
  CompanySettings,
  CompanyBackup,
  CompanyRole,
  ProjectRole,
} from "../types";

const DEFAULT_BOARD_CONFIG = { public: false, requireLogin: true, hideDoneAfterDays: 0 };

// ============================================================
// AUTH & USER
// ============================================================

export async function ensureUserProfile(authUser: AuthUser): Promise<User> {
  const email = authUser.email || "";
  const fullName =
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    email.split("@")[0] ||
    "Usuario";
  const providerList = Array.isArray(authUser.app_metadata?.providers) ? authUser.app_metadata.providers as string[] : [];
  const isGoogleUser = providerList.includes("google");

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || fullName;
  const lastName = nameParts.slice(1).join(" ") || null;

  const profile: User = {
    id: authUser.id,
    auth_user_id: authUser.id,
    name: fullName,
    first_name: firstName,
    last_name: lastName,
    email,
    initials: nameInitials(fullName),
    color: strColor(email || authUser.id),
    role: "MASTER",
    avatar_url: authUser.user_metadata?.avatar_url || null,
    lang: "es",
    ui_config: {},
    google_login_enabled: isGoogleUser,
    google_confirmed_at: authUser.email_confirmed_at || new Date().toISOString(),
    activation_email_sent_at: null,
  };

  // Preserve existing user preferences on re-login
  const { data: existing } = await supabase
    .from("users")
    .select("lang, ui_config, first_name, last_name, avatar_url")
    .eq("id", authUser.id)
    .maybeSingle();
  if (existing) {
    const ex = existing as { lang?: string; ui_config?: Record<string, unknown>; first_name?: string | null; last_name?: string | null; avatar_url?: string | null };
    if (ex.lang) profile.lang = ex.lang;
    if (ex.ui_config) profile.ui_config = ex.ui_config;
    if (ex.first_name) profile.first_name = ex.first_name;
    if (ex.last_name !== undefined) profile.last_name = ex.last_name;
    if (ex.avatar_url) profile.avatar_url = ex.avatar_url;
  }

  const { error } = await supabase.from("users").upsert(profile);
  if (error) console.error("ensureUserProfile error:", error);
  return profile;
}

export async function sendGoogleActivationEmail(email: string) {
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
  });
  if (error) throw error;

  const { error: updateError } = await supabase
    .from("users")
    .update({ activation_email_sent_at: new Date().toISOString() })
    .eq("email", email);
  if (updateError) console.error("sendGoogleActivationEmail update error:", updateError);
}

export async function saveUser(user: User) {
  const { error } = await supabase.from("users").upsert(user);
  if (error) console.error("saveUser error:", error);
}

// ============================================================
// COMPANY INVITES - aceptar invitaciones pendientes al login
// ============================================================

export async function acceptPendingCompanyInvites(user: User) {
  const { data: invites } = await supabase
    .from("company_invites")
    .select("*")
    .eq("email", user.email)
    .eq("status", "pending");

  const pending = (invites || []) as CompanyInvite[];
  if (!pending.length) return;

  const primaryInvite = pending[0];

  await supabase
    .from("company_members")
    .delete()
    .eq("user_id", user.id)
    .neq("company_id", primaryInvite.company_id);

  const memberships: CompanyMember[] = [primaryInvite].map(invite => ({
    id: uid(),
    company_id: invite.company_id,
    user_id: user.id,
    role: invite.role,
    invited_by: invite.invited_by,
    created_at: new Date().toISOString(),
  }));

  const { error: memberError } = await supabase.from("company_members").upsert(memberships, { onConflict: "company_id,user_id" });
  if (memberError) console.error("acceptPendingCompanyInvites member error:", memberError);

  const inviteIds = pending.map(i => i.id);
  const { error: inviteError } = await supabase
    .from("company_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .in("id", inviteIds);
  if (inviteError) console.error("acceptPendingCompanyInvites invite error:", inviteError);
}

export async function acceptPendingInvites(user: User) {
  await acceptPendingCompanyInvites(user);
}

// ============================================================
// COMPANY
// ============================================================

export async function createCompany(
  name: string,
  slug: string,
  contactEmail: string,
  createdBy: string,
  ownerId?: string | null,
  companyCode?: string | null
): Promise<Company> {
  const company: Company = {
    id: uid(),
    name,
    slug: slug.toLowerCase().replace(/\s+/g, "-"),
    company_code: companyCode ? companyCode.trim().toUpperCase() : null,
    contact_email: contactEmail,
    license_plan: "trial",
    created_by: createdBy,
    owner_id: ownerId || createdBy,
    created_at: new Date().toISOString(),
    is_active: true,
  };
  const { error } = await supabase.from("companies").insert(company);
  if (error) throw error;
  const settings: CompanySettings = {
    company_id: company.id,
    log_retention_days: 30,
    backup_retention_count: 10,
    backup_enabled: true,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("company_settings").upsert(settings, { onConflict: "company_id" });
  return company;
}

export async function loadUserCompanies(userId: string): Promise<{ company: Company; role: CompanyRole }[]> {
  // Super admin ve todas
  const { data: userRow } = await supabase.from("users").select("email").eq("id", userId).maybeSingle();
  if ((userRow as { email?: string } | null)?.email === SUPER_ADMIN_EMAIL) {
    const { data } = await supabase.from("companies").select("*").order("name");
    return ((data || []) as Company[]).map(c => ({ company: c, role: "company_admin" as CompanyRole }));
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", userId);

  if (!memberships?.length) return [];

  const companyIds = (memberships as Array<{ company_id: string; role: string }>).map(m => m.company_id);
  const { data: companies } = await supabase.from("companies").select("*").in("id", companyIds);

  const roleMap = new Map((memberships as Array<{ company_id: string; role: string }>).map(m => [m.company_id, m.role as CompanyRole]));
  return ((companies || []) as Company[]).map(c => ({ company: c, role: roleMap.get(c.id) || "member" }));
}

export async function loadAllCompanies(): Promise<Company[]> {
  const { data } = await supabase.from("companies").select("*").order("name");
  return (data || []) as Company[];
}

export async function updateCompany(company: Company) {
  const { error } = await supabase.from("companies").update(company).eq("id", company.id);
  if (error) console.error("updateCompany error:", error);
}

export async function resolveCompanyByCode(companyCode: string): Promise<Company | null> {
  const code = companyCode.trim().toUpperCase();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("company_code", code)
    .maybeSingle();
  return (data || null) as Company | null;
}

export async function loadCompanySettings(companyId: string): Promise<CompanySettings | null> {
  const { data } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  return (data || null) as CompanySettings | null;
}

export async function saveCompanySettings(settings: CompanySettings) {
  const { error } = await supabase
    .from("company_settings")
    .upsert(settings, { onConflict: "company_id" });
  if (error) console.error("saveCompanySettings error:", error);
}

// ============================================================
// COMPANY MEMBERS
// ============================================================

export async function loadCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const { data } = await supabase
    .from("company_members")
    .select("*, user:users(*)")
    .eq("company_id", companyId)
    .order("created_at");
  return (data || []) as CompanyMember[];
}

export async function inviteUserToCompany(
  companyId: string,
  email: string,
  role: CompanyRole,
  invitedBy: string
): Promise<CompanyInvite> {
  const invite: CompanyInvite = {
    id: uid(),
    company_id: companyId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: invitedBy,
    status: "pending",
    created_at: new Date().toISOString(),
    accepted_at: null,
  };
  const { error } = await supabase.from("company_invites").upsert(invite, { onConflict: "company_id,email" });
  if (error) throw error;
  return invite;
}

export async function loadCompanyInvites(companyId: string): Promise<CompanyInvite[]> {
  const { data } = await supabase
    .from("company_invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data || []) as CompanyInvite[];
}

export async function updateCompanyMemberRole(companyId: string, userId: string, role: CompanyRole) {
  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("company_id", companyId)
    .eq("user_id", userId);
  if (error) console.error("updateCompanyMemberRole error:", error);
}

export async function removeCompanyMember(companyId: string, userId: string) {
  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("company_id", companyId)
    .eq("user_id", userId);
  if (error) console.error("removeCompanyMember error:", error);
}

export async function assignUserToCompany(companyId: string, userId: string, role: CompanyRole, invitedBy: string) {
  await supabase
    .from("company_members")
    .delete()
    .eq("user_id", userId)
    .neq("company_id", companyId);

  const member: CompanyMember = {
    id: uid(),
    company_id: companyId,
    user_id: userId,
    role,
    invited_by: invitedBy,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("company_members").upsert(member, { onConflict: "company_id,user_id" });
  if (error) console.error("assignUserToCompany error:", error);
}

export async function revokeCompanyInvite(inviteId: string) {
  const { error } = await supabase.from("company_invites").delete().eq("id", inviteId);
  if (error) console.error("revokeCompanyInvite error:", error);
}

// ============================================================
// WORKSPACES
// ============================================================

export async function createWorkspace(
  companyId: string,
  name: string,
  createdBy: string,
  ownerId?: string | null,
  description?: string
): Promise<Workspace> {
  const { data: existing } = await supabase
    .from("workspaces")
    .select("sort_order")
    .eq("company_id", companyId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (((existing || [])[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;

  let owner = ownerId || null;
  if (!owner) {
    const { data: companyRow } = await supabase.from("companies").select("owner_id").eq("id", companyId).maybeSingle();
    owner = (companyRow as { owner_id?: string } | null)?.owner_id || createdBy;
  }

  const ws: Workspace = {
    id: uid(),
    company_id: companyId,
    name,
    description,
    created_by: createdBy,
    owner_id: owner,
    created_at: new Date().toISOString(),
    sort_order: nextOrder,
  };
  const { error } = await supabase.from("workspaces").insert(ws);
  if (error) throw error;
  return ws;
}

export async function getOrCreateWorkspace(companyId: string, createdBy: string, name = "Principal"): Promise<Workspace> {
  const { data } = await supabase.from("workspaces").select("*").eq("company_id", companyId).order("sort_order").limit(1);
  const existing = (data || [])[0] as Workspace | undefined;
  if (existing) return existing;
  return createWorkspace(companyId, name, createdBy, undefined, "Workspace principal");
}

export async function loadWorkspaces(companyId: string): Promise<Workspace[]> {
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");
  return (data || []) as Workspace[];
}

export async function updateWorkspace(workspace: Workspace) {
  const { error } = await supabase.from("workspaces").update(workspace).eq("id", workspace.id);
  if (error) console.error("updateWorkspace error:", error);
}

export async function deleteWorkspace(workspaceId: string) {
  const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
  if (error) console.error("deleteWorkspace error:", error);
}

// ============================================================
// PROJECTS
// ============================================================

export async function createProject(
  workspaceId: string,
  name: string,
  prefix: string,
  createdBy: string,
  ownerId?: string | null,
  description?: string
): Promise<Project> {
  const { data: existing } = await supabase
    .from("projects")
    .select("sort_order")
    .eq("workspace_id", workspaceId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (((existing || [])[0] as { sort_order?: number } | undefined)?.sort_order ?? -1) + 1;

  let owner = ownerId || null;
  if (!owner) {
    const { data: wsRow } = await supabase.from("workspaces").select("company_id").eq("id", workspaceId).maybeSingle();
    const companyId = (wsRow as { company_id?: string } | null)?.company_id || null;
    if (companyId) {
      const { data: companyRow } = await supabase.from("companies").select("owner_id").eq("id", companyId).maybeSingle();
      owner = (companyRow as { owner_id?: string } | null)?.owner_id || createdBy;
    } else {
      owner = createdBy;
    }
  }

  const project: Project = {
    id: uid(),
    workspace_id: workspaceId,
    name,
    description,
    prefix: prefix.toUpperCase(),
    created_by: createdBy,
    owner_id: owner,
    created_at: new Date().toISOString(),
    sort_order: nextOrder,
    is_archived: false,
  };
  const { error } = await supabase.from("projects").insert(project);
  if (error) throw error;
  return project;
}

export async function loadProjects(workspaceId: string): Promise<Project[]> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_archived", false)
    .order("sort_order");
  return (data || []) as Project[];
}

export async function loadAllCompanyProjects(companyId: string): Promise<Project[]> {
  const { data: wss } = await supabase.from("workspaces").select("id").eq("company_id", companyId);
  const wsIds = ((wss || []) as Array<{ id: string }>).map(w => w.id);
  if (!wsIds.length) return [];

  const { data } = await supabase
    .from("projects")
    .select("*")
    .in("workspace_id", wsIds)
    .eq("is_archived", false)
    .order("sort_order");
  return (data || []) as Project[];
}

export async function loadCompanyBoards(companyId: string): Promise<Board[]> {
  const { data } = await supabase.from("boards").select("*").eq("company_id", companyId).order("created_at");
  return (data || []) as Board[];
}

export async function loadCompanyCards(companyId: string): Promise<Card[]> {
  const { data: boardIds } = await supabase.from("boards").select("id").eq("company_id", companyId);
  const ids = (boardIds || []).map((b: { id: string }) => b.id);
  if (!ids.length) return [];
  const { data } = await supabase.from("cards").select("*").in("board_id", ids);
  return (data || []) as Card[];
}

export async function loadCompanyImprovements(companyId: string): Promise<Improvement[]> {
  return loadImprovements(companyId);
}

export async function updateProject(project: Project) {
  const { error } = await supabase.from("projects").update(project).eq("id", project.id);
  if (error) console.error("updateProject error:", error);
}

export async function archiveProject(projectId: string) {
  const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", projectId);
  if (error) console.error("archiveProject error:", error);
}

// ============================================================
// PROJECT MEMBERS
// ============================================================

export async function loadProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at");
  return (data || []) as ProjectMember[];
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole,
  assignedBy: string
) {
  const member: ProjectMember = {
    id: uid(),
    project_id: projectId,
    user_id: userId,
    role,
    assigned_by: assignedBy,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("project_members").upsert(member, { onConflict: "project_id,user_id" });
  if (error) throw error;
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectRole) {
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) console.error("updateProjectMemberRole error:", error);
}

export async function removeProjectMember(projectId: string, userId: string) {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) console.error("removeProjectMember error:", error);
}

// ============================================================
// FEATURE FLAGS
// ============================================================

export async function loadFeatureCatalog(): Promise<Feature[]> {
  const { data } = await supabase.from("features").select("*").order("sort_order");
  return (data || []) as Feature[];
}

export async function loadCompanyFeatures(companyId: string): Promise<CompanyFeature[]> {
  const { data } = await supabase.from("company_features").select("*").eq("company_id", companyId);
  return (data || []) as CompanyFeature[];
}

export async function resolveCompanyFeatureFlags(companyId: string): Promise<FeatureFlags> {
  const [catalog, overrides] = await Promise.all([
    loadFeatureCatalog(),
    loadCompanyFeatures(companyId),
  ]);

  const overrideMap = new Map(overrides.map(o => [o.feature_key, o.is_enabled]));
  const flags: FeatureFlags = {};
  for (const feature of catalog) {
    if (feature.is_mandatory) flags[feature.key] = true;
    else if (overrideMap.has(feature.key)) flags[feature.key] = overrideMap.get(feature.key)!;
    else flags[feature.key] = feature.default_on;
  }
  return flags;
}

export async function setCompanyFeature(
  companyId: string,
  featureKey: string,
  isEnabled: boolean,
  updatedBy: string
) {
  const row: CompanyFeature = {
    id: uid(),
    company_id: companyId,
    feature_key: featureKey,
    is_enabled: isEnabled,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("company_features")
    .upsert(row, { onConflict: "company_id,feature_key" });
  if (error) console.error("setCompanyFeature error:", error);
}
export async function loadProjectFeatures(projectId: string): Promise<ProjectFeature[]> {
  const { data } = await supabase.from("project_features").select("*").eq("project_id", projectId);
  return (data || []) as ProjectFeature[];
}

export async function resolveFeatureFlags(projectId: string): Promise<FeatureFlags> {
  const [catalog, overrides] = await Promise.all([
    loadFeatureCatalog(),
    loadProjectFeatures(projectId),
  ]);
  const overrideMap = new Map(overrides.map(o => [o.feature_key, o.is_enabled]));

  const flags: FeatureFlags = {};
  for (const feature of catalog) {
    if (feature.is_mandatory) {
      flags[feature.key] = true;
    } else if (overrideMap.has(feature.key)) {
      flags[feature.key] = overrideMap.get(feature.key)!;
    } else {
      flags[feature.key] = feature.default_on;
    }
  }
  return flags;
}

export async function setProjectFeature(
  projectId: string,
  featureKey: string,
  isEnabled: boolean,
  updatedBy: string
) {
  const row: ProjectFeature = {
    id: uid(),
    project_id: projectId,
    feature_key: featureKey,
    is_enabled: isEnabled,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("project_features")
    .upsert(row, { onConflict: "project_id,feature_key" });
  if (error) console.error("setProjectFeature error:", error);
}

export async function updateFeatureCatalog(feature: Feature) {
  const { error } = await supabase.from("features").update(feature).eq("id", feature.id);
  if (error) console.error("updateFeatureCatalog error:", error);
}

// ============================================================
// BOARDS
// ============================================================

export async function loadBoardsForProject(projectId: string): Promise<Board[]> {
  const { data } = await supabase
    .from("boards")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order");
  return (data || []) as Board[];
}

export async function saveBoard(board: Board, actorUserId?: string) {
  const payload: Record<string, unknown> = {
    id: board.id,
    company_id: board.company_id,
    title: board.title,
    prefix: board.prefix,
    card_seq: board.card_seq,
    owner_user_id: board.owner_user_id,
    board_config: board.board_config,
    visible_fields: board.visible_fields,
    categories: board.categories,
  };

  if ("project_id" in board && board.project_id) payload.project_id = board.project_id;
  if ("sort_order" in board && typeof board.sort_order !== "undefined") payload.sort_order = board.sort_order;
  if ("created_at" in board && typeof board.created_at !== "undefined") payload.created_at = board.created_at;

  const { error } = await supabase.from("boards").upsert(payload);
  if (error) console.error("saveBoard error:", error);
  if (!error && actorUserId) {
    await logBoardChange({
      company_id: board.company_id,
      board_id: board.id,
      user_id: actorUserId,
      entity_id: board.id,
      entity_type: "board",
      change: "board_upsert",
    });
  }
}

// ============================================================
// BOARD STATES / COLUMNS
// ============================================================

export async function saveColumn(col: BoardColumn, actorUserId?: string) {
  const { error } = await supabase.from("board_columns").upsert(col);
  if (error) console.error("saveColumn error:", error);
  if (!error && actorUserId) {
    const companyId = await resolveBoardCompany(col.board_id);
    if (companyId) {
      await logBoardChange({
        company_id: companyId,
        board_id: col.board_id,
        user_id: actorUserId,
        entity_id: col.id,
        entity_type: "column",
        change: "column_upsert",
      });
    }
  }
}

export async function saveState(st: BoardState, actorUserId?: string) {
  const { error } = await supabase.from("board_states").upsert(st);
  if (error) console.error("saveState error:", error);
  if (!error && actorUserId) {
    const companyId = await resolveBoardCompany(st.board_id);
    if (companyId) {
      await logBoardChange({
        company_id: companyId,
        board_id: st.board_id,
        user_id: actorUserId,
        entity_id: st.id,
        entity_type: "state",
        change: "state_upsert",
      });
    }
  }
}

export async function deleteColumn(id: string, actorUserId?: string) {
  const { data: col } = await supabase.from("board_columns").select("board_id").eq("id", id).maybeSingle();
  await supabase.from("board_columns").delete().eq("id", id);
  await supabase.from("cards").delete().eq("col_id", id);
  if (actorUserId && (col as { board_id?: string } | null)?.board_id) {
    const boardId = (col as { board_id?: string }).board_id!;
    const companyId = await resolveBoardCompany(boardId);
    if (companyId) {
      await logBoardChange({
        company_id: companyId,
        board_id: boardId,
        user_id: actorUserId,
        entity_id: id,
        entity_type: "column",
        change: "column_delete",
      });
    }
  }
}

export async function deleteState(id: string, actorUserId?: string) {
  const { data: st } = await supabase.from("board_states").select("board_id").eq("id", id).maybeSingle();
  await supabase.from("board_states").delete().eq("id", id);
  if (actorUserId && (st as { board_id?: string } | null)?.board_id) {
    const boardId = (st as { board_id?: string }).board_id!;
    const companyId = await resolveBoardCompany(boardId);
    if (companyId) {
      await logBoardChange({
        company_id: companyId,
        board_id: boardId,
        user_id: actorUserId,
        entity_id: id,
        entity_type: "state",
        change: "state_delete",
      });
    }
  }
}

async function resolveBoardCompany(boardId: string): Promise<string | null> {
  const { data } = await supabase.from("boards").select("company_id").eq("id", boardId).maybeSingle();
  return (data as { company_id?: string } | null)?.company_id || null;
}

export async function logBoardChange(entry: Omit<BoardLog, "id" | "created_at">) {
  const row: BoardLog = {
    id: uid(),
    ...entry,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("board_logs").insert(row);
  if (error) console.error("logBoardChange error:", error);
}

// ============================================================
// CARDS
// ============================================================

export async function saveCard(card: Card, actorUserId?: string) {
  const { error } = await supabase.from("cards").upsert({
    id: card.id, card_id: card.card_id, board_id: card.board_id,
    col_id: card.col_id, state_id: card.state_id, title: card.title,
    description: card.description, type: card.type, category: card.category,
    due_date: card.due_date || null, blocked: card.blocked, creator_id: card.creator_id,
    seq_id: card.seq_id ?? null,
    attachments: card.attachments, comments: card.comments, history: card.history,
    depends_on: card.depends_on, blocked_by: card.blocked_by,
    time_per_col: card.time_per_col, col_since: card.col_since,
    created_at: card.created_at,
    completed_at: card.completed_at, discarded_at: card.discarded_at,
  });
  if (error) console.error("saveCard error:", error);
  if (!error && actorUserId) {
    const companyId = await resolveBoardCompany(card.board_id);
    if (companyId) {
      await logBoardChange({
        company_id: companyId,
        board_id: card.board_id,
        user_id: actorUserId,
        entity_id: card.id,
        entity_type: "card",
        change: "card_upsert",
      });
    }
  }
}

// ============================================================
// COMPOSITE LOADERS
// ============================================================

export async function loadProjectData(projectId: string): Promise<{
  boards: Board[];
  featureFlags: FeatureFlags;
  projectMembers: ProjectMember[];
  companyId: string | null;
}> {
  const { data: projectRow } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .maybeSingle();
  const workspaceId = (projectRow as { workspace_id?: string } | null)?.workspace_id || null;
  let companyId: string | null = null;
  if (workspaceId) {
    const { data: ws } = await supabase.from("workspaces").select("company_id").eq("id", workspaceId).maybeSingle();
    companyId = (ws as { company_id?: string } | null)?.company_id || null;
  }

  const [boards, projectMembers, featureFlags] = await Promise.all([
    loadBoardsForProject(projectId),
    loadProjectMembers(projectId),
    companyId ? resolveCompanyFeatureFlags(companyId) : resolveFeatureFlags(projectId),
  ]);
  return { boards, featureFlags, projectMembers, companyId };
}

export async function loadBoardData(boardId: string): Promise<{
  states: BoardState[];
  columns: BoardColumn[];
  cards: Card[];
  users: User[];
}> {
  const [statesRes, columnsRes, cardsRes] = await Promise.all([
    supabase.from("board_states").select("*").eq("board_id", boardId).order("sort_order"),
    supabase.from("board_columns").select("*").eq("board_id", boardId).order("sort_order"),
    supabase.from("cards").select("*").eq("board_id", boardId),
  ]);

  const cards = (cardsRes.data || []) as Card[];

  // Cargar usuarios únicos que aparecen como creadores
  const creatorIds = [...new Set(cards.map(c => c.creator_id).filter(Boolean))];
  let users: User[] = [];
  if (creatorIds.length) {
    const { data } = await supabase.from("users").select("*").in("id", creatorIds);
    users = (data || []) as User[];
  }

  return {
    states: (statesRes.data || []) as BoardState[],
    columns: (columnsRes.data || []) as BoardColumn[],
    cards,
    users,
  };
}

export async function loadCompanyLogs(companyId: string, limit = 200): Promise<BoardLog[]> {
  const { data } = await supabase
    .from("board_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as BoardLog[];
}

export async function loadCompanyAdminLogs(companyId: string, limit = 200): Promise<CompanyAdminLog[]> {
  const { data } = await supabase
    .from("company_admin_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as CompanyAdminLog[];
}

export async function logCompanyAdminAction(
  companyId: string,
  userId: string,
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: Record<string, unknown> | null
) {
  const payload = {
    id: uid(),
    company_id: companyId,
    user_id: userId,
    action,
    entity_type: entityType || null,
    entity_id: entityId || null,
    details: details || null,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("company_admin_logs").insert(payload);
  if (error) console.error("logCompanyAdminAction error:", error);
}

export async function loadCompanyBackups(companyId: string): Promise<CompanyBackup[]> {
  const { data } = await supabase
    .from("company_backups")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return (data || []) as CompanyBackup[];
}

export async function createCompanyBackup(companyId: string, createdBy: string, summary: string) {
  const [projects, boardsRes, improvements, settings, features] = await Promise.all([
    loadAllCompanyProjects(companyId),
    supabase.from("boards").select("*").eq("company_id", companyId),
    supabase.from("improvements").select("*").eq("company_id", companyId),
    loadCompanySettings(companyId),
    loadCompanyFeatures(companyId),
  ]);

  const boards = (boardsRes.data || []) as Board[];
  const boardIds = boards.map(b => b.id);
  const [statesRes, columnsRes, cardsRes] = boardIds.length
    ? await Promise.all([
        supabase.from("board_states").select("*").in("board_id", boardIds),
        supabase.from("board_columns").select("*").in("board_id", boardIds),
        supabase.from("cards").select("*").in("board_id", boardIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const snapshot = {
    projects,
    boards,
    states: (statesRes.data || []),
    columns: (columnsRes.data || []),
    cards: (cardsRes.data || []),
    improvements: (improvements.data || []),
    settings,
    features,
  };

  const row: CompanyBackup = {
    id: uid(),
    company_id: companyId,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    summary,
    snapshot,
  };

  const { error } = await supabase.from("company_backups").insert(row);
  if (error) console.error("createCompanyBackup error:", error);

  const settingsRow = settings || {
    company_id: companyId,
    log_retention_days: 30,
    backup_retention_count: 10,
    backup_enabled: true,
    updated_at: new Date().toISOString(),
  };

  const backups = await loadCompanyBackups(companyId);
  const keep = Math.max(1, settingsRow.backup_retention_count || 10);
  const toDelete = backups.slice(keep);
  if (toDelete.length) {
    const ids = toDelete.map(b => b.id);
    await supabase.from("company_backups").delete().in("id", ids);
  }
}

// Carga los usuarios de una empresa por sus membresías de proyecto
export async function loadProjectUsers(projectId: string): Promise<User[]> {
  const members = await loadProjectMembers(projectId);
  if (!members.length) return [];
  const userIds = members.map(m => m.user_id);
  const { data } = await supabase.from("users").select("*").in("id", userIds);
  return (data || []) as User[];
}

export async function loadLegacyBoardApp(userId: string, preferredBoardId?: string | null): Promise<{
  users: User[];
  boards: Board[];
  states: BoardState[];
  columns: BoardColumn[];
  cards: Card[];
  activeBoardId: string | null;
}> {
  const { data: boardsRes, error } = await supabase.from("boards").select("*").order("created_at");
  if (error) {
    console.error("loadLegacyBoardApp boards error:", error);
    return { users: [], boards: [], states: [], columns: [], cards: [], activeBoardId: null };
  }

  const boards = (boardsRes || []) as Board[];
  const activeBoard = boards.find(board => board.id === preferredBoardId) || boards[0] || null;

  if (!activeBoard) {
    return { users: [], boards: [], states: [], columns: [], cards: [], activeBoardId: null };
  }

  const data = await loadBoardData(activeBoard.id);
  const mergedUsers = Array.from(
    new Map(
      [
        ...data.users,
        ...(data.cards.map(card => ({ id: card.creator_id } as User))),
      ].map(user => [user.id, user])
    ).values()
  ).filter(Boolean) as User[];

  if (!mergedUsers.some(user => user.id === userId)) {
    const { data: currentUser } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    if (currentUser) mergedUsers.unshift(currentUser as User);
  }

  return {
    users: mergedUsers,
    boards,
    states: data.states,
    columns: data.columns,
    cards: data.cards,
    activeBoardId: activeBoard.id,
  };
}

export async function loadAll(userId: string, preferredBoardId?: string | null): Promise<AppData> {
  const companyLinks = await loadUserCompanies(userId);
  const company = companyLinks[0]?.company || null;

  if (!company) {
    return {
      company: null,
      workspaces: [],
      projects: [],
      activeWorkspaceId: null,
      activeProjectId: null,
      featureFlags: {},
      users: [],
      boards: [],
      states: [],
      columns: [],
      cards: [],
      invites: [],
      activeBoardId: null,
    };
  }

  const workspaces = await loadWorkspaces(company.id);
  const activeWorkspaceId = workspaces[0]?.id || null;
  const projects = activeWorkspaceId ? await loadProjects(activeWorkspaceId) : [];
  const activeProjectId = projects[0]?.id || null;
  const featureFlags = await resolveCompanyFeatureFlags(company.id);
  let boards = activeProjectId ? await loadBoardsForProject(activeProjectId) : [];

  if (!boards.length && activeProjectId) {
    const { data: userRow } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
    if (userRow) {
      await seedBoardForProject(activeProjectId, userRow as User);
      boards = await loadBoardsForProject(activeProjectId);
    }
  }

  const activeBoard = boards.find(board => board.id === preferredBoardId) || boards[0] || null;
  if (!activeBoard) {
    return {
      company,
      workspaces,
      projects,
      activeWorkspaceId,
      activeProjectId,
      featureFlags,
      users: [],
      boards,
      states: [],
      columns: [],
      cards: [],
      invites: [],
      activeBoardId: null,
    };
  }

  const boardData = await loadBoardData(activeBoard.id);
  const users = await loadProjectUsers(activeBoard.project_id);

  return {
    company,
    workspaces,
    projects,
    activeWorkspaceId,
    activeProjectId,
    featureFlags,
    users: users.length ? users : boardData.users,
    boards,
    states: boardData.states,
    columns: boardData.columns,
    cards: boardData.cards,
    invites: [],
    activeBoardId: activeBoard.id,
  };
}

export async function inviteUserToBoard(boardId: string, email: string, invitedByUserId: string): Promise<BoardInvite> {
  const invite: BoardInvite = {
    id: uid(),
    board_id: boardId,
    email: email.trim().toLowerCase(),
    invited_by_user_id: invitedByUserId,
    status: "pending",
    created_at: new Date().toISOString(),
    accepted_at: null,
  };

  const { data: board } = await supabase.from("boards").select("project_id").eq("id", boardId).maybeSingle();
  const projectId = (board as { project_id?: string } | null)?.project_id;
  if (!projectId) return invite;

  const { data: user } = await supabase.from("users").select("id").eq("email", invite.email).maybeSingle();
  const invitedUserId = (user as { id?: string } | null)?.id;
  if (invitedUserId) {
    await addProjectMember(projectId, invitedUserId, "member", invitedByUserId);
  }

  return invite;
}

export async function removeBoardInvite(_inviteId: string) {
  void _inviteId;
  return;
}

export async function removeBoardMember(boardId: string, userId: string) {
  const { data: board } = await supabase.from("boards").select("project_id").eq("id", boardId).maybeSingle();
  const projectId = (board as { project_id?: string } | null)?.project_id;
  if (!projectId) return;
  await removeProjectMember(projectId, userId);
}

// ============================================================
// SEED - tablero inicial para un proyecto nuevo
// ============================================================

function makeSeedCard(
  id: string,
  boardId: string,
  user: User,
  colId: string,
  stateId: string,
  projectPrefix: string,
  extra: Partial<Card>
): Card {
  const lang = (user.lang === "en" ? "en" : "es") as "en" | "es";
  const cardId = `${projectPrefix.toUpperCase()}-TMP-${id.slice(0, 4)}`;
  return {
    id, card_id: cardId, board_id: boardId, col_id: colId, state_id: stateId,
    title: lang === "en" ? "New card" : "Nueva tarjeta",
    type: "tarea",
    category: lang === "en" ? "General" : "General",
    due_date: "",
    blocked: false,
    creator_id: user.id,
    description: "",
    attachments: [],
    comments: [],
    history: [histEntry(lang === "en" ? "Card created" : "Tarjeta creada", user, lang)],
    depends_on: [],
    blocked_by: [],
    time_per_col: {},
    col_since: Date.now(),
    created_at: new Date().toISOString(),
    completed_at: null,
    discarded_at: null,
    ...extra,
  };
}

export async function seedBoardForProject(projectId: string, user: User): Promise<Board> {
  const isEn = user.lang === "en";
  const boardId = uid();
  const { data: projectRow } = await supabase.from("projects").select("workspace_id, prefix, owner_id").eq("id", projectId).maybeSingle();
  const projectInfo = projectRow as { workspace_id?: string; prefix?: string; owner_id?: string } | null;
  const workspaceId = projectInfo?.workspace_id || null;
  const projectPrefix = projectInfo?.prefix || "PRJ";
  const projectOwner = projectInfo?.owner_id || user.id;
  let companyId = "";
  if (workspaceId) {
    const { data: ws } = await supabase.from("workspaces").select("company_id").eq("id", workspaceId).maybeSingle();
    companyId = (ws as { company_id?: string } | null)?.company_id || "";
  }
  const board: Board = {
    id: boardId,
    company_id: companyId,
    project_id: projectId,
    title: isEn ? "Main board" : "Tablero principal",
    prefix: "TBL",
    card_seq: 0,
    owner_user_id: projectOwner,
    board_config: DEFAULT_BOARD_CONFIG,
    visible_fields: DEFAULT_VISIBLE,
    categories: isEn ? ["General", "Backend", "Frontend", "Product"] : ["General", "Backend", "Frontend", "Producto"],
    sort_order: 0,
  };

  const states: BoardState[] = [
    { id: uid(), board_id: boardId, name: isEn ? "Pending" : "Pendiente", phase: "pre", is_discard: false, sort_order: 0 },
    { id: uid(), board_id: boardId, name: isEn ? "In progress" : "En curso", phase: "work", is_discard: false, sort_order: 1 },
    { id: uid(), board_id: boardId, name: isEn ? "Done" : "Completado", phase: "post", is_discard: false, sort_order: 2 },
    { id: uid(), board_id: boardId, name: isEn ? "Discarded" : "Descartado", phase: "post", is_discard: true, sort_order: 3 },
  ];

  const columns: BoardColumn[] = [
    { id: uid(), board_id: boardId, name: isEn ? "To do" : "Por hacer", phase: "pre", state_ids: [states[0].id], wip_limit: 0, is_wip: false, sort_order: 0 },
    { id: uid(), board_id: boardId, name: isEn ? "In progress" : "En progreso", phase: "work", state_ids: [states[1].id], wip_limit: 3, is_wip: true, sort_order: 1 },
    { id: uid(), board_id: boardId, name: isEn ? "Done" : "Hecho", phase: "post", state_ids: [states[2].id], wip_limit: 0, is_wip: false, sort_order: 2 },
    { id: uid(), board_id: boardId, name: isEn ? "Discarded" : "Descartado", phase: "post", state_ids: [states[3].id], wip_limit: 0, is_wip: false, sort_order: 3 },
  ];

  const cards: Card[] = [
    makeSeedCard(uid(), boardId, user, columns[0].id, states[0].id, projectPrefix, {
      title: isEn ? "Set up initial access" : "Configurar acceso inicial",
      category: isEn ? "General" : "General",
      description: isEn ? "Board created automatically when the project was created." : "Tablero creado automáticamente al crear el proyecto.",
    }),
    makeSeedCard(uid(), boardId, user, columns[1].id, states[1].id, projectPrefix, {
      title: isEn ? "Invite collaborators" : "Invitar a colaboradores",
      category: isEn ? "Product" : "Producto",
      description: isEn ? "From Settings > Members you can add users to the project." : "Desde Configuración > Miembros puedes añadir usuarios al proyecto.",
    }),
    makeSeedCard(uid(), boardId, user, columns[2].id, states[2].id, projectPrefix, {
      title: isEn ? "Review active features" : "Revisar funcionalidades activas",
      category: isEn ? "Product" : "Producto",
      description: isEn ? "From Settings > Features you can enable or disable features." : "Desde Configuración > Funcionalidades activa o desactiva features.",
      completed_at: new Date().toISOString(),
    }),
  ];

  await saveBoard(board);
  await Promise.all(columns.map(col => saveColumn(col)));
  await Promise.all(states.map(state => saveState(state)));
  await Promise.all(cards.map(card => createCard(card, projectPrefix, user.id)));

  return board;
}

export async function seedLegacyBoardForUser(user: User): Promise<Board> {
  const isEn = user.lang === "en";
  const boardId = uid();
  const board = {
    id: boardId,
    title: isEn ? "My board" : "Mi tablero",
    prefix: "KAN",
    card_seq: 4,
    owner_user_id: user.id,
    board_config: DEFAULT_BOARD_CONFIG,
    visible_fields: DEFAULT_VISIBLE,
    categories: isEn ? ["General", "Backend", "Frontend", "Product"] : ["General", "Backend", "Frontend", "Producto"],
    created_at: new Date().toISOString(),
  } as Board;

  const states: BoardState[] = [
    { id: uid(), board_id: boardId, name: isEn ? "Pending" : "Pendiente", phase: "pre", is_discard: false, sort_order: 0 },
    { id: uid(), board_id: boardId, name: isEn ? "In progress" : "En curso", phase: "work", is_discard: false, sort_order: 1 },
    { id: uid(), board_id: boardId, name: isEn ? "Done" : "Completado", phase: "post", is_discard: false, sort_order: 2 },
    { id: uid(), board_id: boardId, name: isEn ? "Discarded" : "Descartado", phase: "post", is_discard: true, sort_order: 3 },
  ];

  const columns: BoardColumn[] = [
    { id: uid(), board_id: boardId, name: isEn ? "To do" : "Por hacer", phase: "pre", state_ids: [states[0].id], wip_limit: 0, is_wip: false, sort_order: 0 },
    { id: uid(), board_id: boardId, name: isEn ? "In progress" : "En progreso", phase: "work", state_ids: [states[1].id], wip_limit: 3, is_wip: true, sort_order: 1 },
    { id: uid(), board_id: boardId, name: isEn ? "Done" : "Hecho", phase: "post", state_ids: [states[2].id], wip_limit: 0, is_wip: false, sort_order: 2 },
    { id: uid(), board_id: boardId, name: isEn ? "Discarded" : "Descartado", phase: "post", state_ids: [states[3].id], wip_limit: 0, is_wip: false, sort_order: 3 },
  ];

  const cards: Card[] = [
    makeSeedCard(uid(), boardId, user, columns[0].id, states[0].id, board.prefix, {
      title: isEn ? "Set up initial access" : "Configurar acceso inicial",
      category: isEn ? "General" : "General",
      description: isEn ? "Personal board created automatically on first sign-in." : "Tablero personal creado automáticamente al iniciar sesión por primera vez.",
    }),
    makeSeedCard(uid(), boardId, user, columns[1].id, states[1].id, board.prefix, {
      title: isEn ? "Review improvements backlog" : "Revisar backlog de mejoras",
      category: isEn ? "Product" : "Producto",
      description: isEn ? "You can propose and vote on improvements from the shared view." : "Puedes proponer y votar mejoras desde la vista compartida.",
    }),
    makeSeedCard(uid(), boardId, user, columns[2].id, states[2].id, board.prefix, {
      title: isEn ? "Explore the board" : "Explorar el tablero",
      category: isEn ? "Frontend" : "Frontend",
      description: isEn ? "Move cards across columns and open details to edit fields." : "Mueve tarjetas entre columnas y abre su detalle para editar campos.",
      completed_at: new Date().toISOString(),
    }),
  ];

  await saveBoard(board);
  await Promise.all(columns.map(col => saveColumn(col)));
  await Promise.all(states.map(state => saveState(state)));
  await Promise.all(cards.map(card => createCard(card, board.prefix, user.id)));

  return board;
}

// ============================================================
// IMPROVEMENTS
// ============================================================

export async function saveImprovement(imp: Improvement) {
  const { error } = await supabase.from("improvements").upsert(imp);
  if (error) console.error("saveImprovement error:", error);
}

export async function loadImprovements(companyId?: string, currentUserId?: string): Promise<Improvement[]> {
  const [{ data: improvements }, { data: boards }, { data: votes }] = await Promise.all([
    companyId
      ? supabase.from("improvements").select("*").eq("company_id", companyId).order("created_at", { ascending: false })
      : supabase.from("improvements").select("*").order("created_at", { ascending: false }),
    companyId
      ? supabase.from("boards").select("id,title").eq("company_id", companyId)
      : supabase.from("boards").select("id,title"),
    supabase.from("improvement_votes").select("*"),
  ]);

  const boardMap = new Map((boards || []).map((board: { id: string; title: string }) => [board.id, board.title]));
  const voteRows = (votes || []) as ImprovementVote[];

  return ((improvements || []) as Improvement[]).map(imp => {
    const impVotes = voteRows.filter(v => v.improvement_id === imp.id);
    return {
      ...imp,
      vote_count: impVotes.length,
      current_user_voted: currentUserId ? impVotes.some(v => v.user_id === currentUserId) : false,
      board_title: boardMap.get(imp.board_id) || null,
    };
  });
}

export async function markImprovementsAiPending(ids: string[]) {
  if (!ids.length) return;
  await supabase.from("improvements").update({ status: "ai_pending" }).in("id", ids);
}

export async function addImprovementVote(improvementId: string, userId: string) {
  const vote: ImprovementVote = {
    id: uid(),
    improvement_id: improvementId,
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("improvement_votes").upsert(vote, { onConflict: "improvement_id,user_id" });
  if (error) throw error;
}

export async function removeImprovementVote(improvementId: string, userId: string) {
  const { error } = await supabase.from("improvement_votes").delete()
    .eq("improvement_id", improvementId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function loadAdminConsoleData(currentUserId?: string): Promise<AdminConsoleData> {
  const [usersRes, boardsRes, cardsRes, improvements] = await Promise.all([
    supabase.from("users").select("*").order("name"),
    supabase.from("boards").select("*").order("title"),
    supabase.from("cards").select("board_id"),
    loadImprovements(undefined, currentUserId),
  ]);

  const users = (usersRes.data || []) as User[];
  const boards = (boardsRes.data || []) as Board[];
  const cards = (cardsRes.data || []) as Array<{ board_id: string }>;

  const userMap = new Map(users.map(user => [user.id, user]));
  const boardSummaries: AdminBoardSummary[] = boards.map(board => ({
    ...board,
    owner_name: userMap.get(board.owner_user_id)?.name || null,
    member_count: 0,
    card_count: cards.filter(card => card.board_id === board.id).length,
  }));

  return {
    users,
    boards: boardSummaries,
    improvements,
  };
}

// ============================================================
// URL ROUTING - resolucion de entidades por codigo/ID
// ============================================================

export type ResolvedEntity =
  | { type: "company";   id: string; company: import("../types").Company }
  | { type: "project";   id: string; project: import("../types").Project; workspaceId: string; companyId: string }
  | { type: "card";      id: string; card: import("../types").Card; boardId: string; boardNumericId?: number | null }
  | { type: "workspace"; id: string; workspace: import("../types").Workspace }
  | { type: "board";     id: string; board: import("../types").Board }
  | null;

/**
 * Resolves a short code to the matching entity:
 * - company_code -> Company
 * - project prefix -> Project
 * - PROJECT-NNN pattern -> Card
 */
export async function resolveEntityByCode(code: string): Promise<ResolvedEntity> {
  const raw = code.trim();
  const clean = raw.toUpperCase();

  // Card pattern: PREFIX-NUMBER
  if (/^([A-Z0-9]{1,10})-\d+$/.test(clean)) {
    const { data: card } = await supabase.from("cards").select("*").eq("card_id", clean).maybeSingle();
    if (card) {
      const { data: board } = await supabase.from("boards").select("numeric_id").eq("id", (card as Card).board_id).maybeSingle();
      const boardNumericId = (board as { numeric_id?: number } | null)?.numeric_id ?? null;
      return { type: "card", id: (card as Card).id, card: card as Card, boardId: (card as Card).board_id, boardNumericId };
    }
  }

  // Try company_code
  const { data: company } = await supabase.from("companies").select("*").ilike("company_code", clean).maybeSingle();
  if (company) return { type: "company", id: (company as Company).id, company: company as Company };

  // Try project prefix
  const { data: project } = await supabase.from("projects").select("*").ilike("prefix", clean).maybeSingle();
  if (project) {
    const p = project as Project;
    const { data: ws } = await supabase.from("workspaces").select("company_id").eq("id", p.workspace_id).maybeSingle();
    const companyId = (ws as { company_id?: string } | null)?.company_id || "";
    return { type: "project", id: p.id, project: p, workspaceId: p.workspace_id, companyId };
  }

  // Numeric short code (workspace/board numeric_id)
  if (/^\d+$/.test(clean)) {
    const numericId = Number(clean);
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("numeric_id", numericId).maybeSingle();
    if (workspace) return { type: "workspace", id: (workspace as Workspace).id, workspace: workspace as Workspace };

    const { data: board } = await supabase.from("boards").select("*").eq("numeric_id", numericId).maybeSingle();
    if (board) return { type: "board", id: (board as Board).id, board: board as Board };
  }

  // Direct UUID lookup (company/workspace/project/board/card IDs)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    const { data: companyById } = await supabase.from("companies").select("*").eq("id", raw).maybeSingle();
    if (companyById) return { type: "company", id: (companyById as Company).id, company: companyById as Company };

    const { data: workspaceById } = await supabase.from("workspaces").select("*").eq("id", raw).maybeSingle();
    if (workspaceById) return { type: "workspace", id: (workspaceById as Workspace).id, workspace: workspaceById as Workspace };

    const { data: projectById } = await supabase.from("projects").select("*").eq("id", raw).maybeSingle();
    if (projectById) {
      const p = projectById as Project;
      const { data: ws } = await supabase.from("workspaces").select("company_id").eq("id", p.workspace_id).maybeSingle();
      const companyId = (ws as { company_id?: string } | null)?.company_id || "";
      return { type: "project", id: p.id, project: p, workspaceId: p.workspace_id, companyId };
    }

    const { data: boardById } = await supabase.from("boards").select("*").eq("id", raw).maybeSingle();
    if (boardById) return { type: "board", id: (boardById as Board).id, board: boardById as Board };

    const { data: cardById } = await supabase.from("cards").select("*").eq("id", raw).maybeSingle();
    if (cardById) {
      const { data: board } = await supabase.from("boards").select("numeric_id").eq("id", (cardById as Card).board_id).maybeSingle();
      const boardNumericId = (board as { numeric_id?: number } | null)?.numeric_id ?? null;
      return { type: "card", id: (cardById as Card).id, card: cardById as Card, boardId: (cardById as Card).board_id, boardNumericId };
    }
  }

  return null;
}

/** Resolve workspace by numeric_id (/workspace/:numericId) */
export async function resolveWorkspaceByNumericId(numericId: number): Promise<Workspace | null> {
  const { data } = await supabase.from("workspaces").select("*").eq("numeric_id", numericId).maybeSingle();
  return (data || null) as Workspace | null;
}

/** Resolve board by numeric_id (/board/:numericId) */
export async function resolveBoardByNumericId(numericId: number): Promise<Board | null> {
  const { data } = await supabase.from("boards").select("*").eq("numeric_id", numericId).maybeSingle();
  return (data || null) as Board | null;
}

// ============================================================
// USER PROFILE
// ============================================================

export async function updateUserProfile(
  userId: string,
  updates: { first_name?: string; last_name?: string; avatar_url?: string | null; lang?: string }
): Promise<void> {
  const nameUpdate: Record<string, unknown> = { ...updates };
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    const { data: existing } = await supabase.from("users").select("first_name, last_name").eq("id", userId).maybeSingle();
    const ex = (existing || {}) as { first_name?: string; last_name?: string };
    const fn = updates.first_name ?? ex.first_name ?? "";
    const ln = updates.last_name ?? ex.last_name ?? "";
    nameUpdate.name = [fn, ln].filter(Boolean).join(" ") || fn;
    nameUpdate.initials = nameInitials(nameUpdate.name as string);
  }
  const { error } = await supabase.from("users").update(nameUpdate).eq("id", userId);
  if (error) console.error("updateUserProfile error:", error);
}

export async function saveUserUiConfig(userId: string, config: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("users").update({ ui_config: config }).eq("id", userId);
  if (error) console.error("saveUserUiConfig error:", error);
}

// ============================================================
// AVATAR UPLOAD
// ============================================================

export async function uploadAvatar(authUserId: string, file: File): Promise<string> {
  const MAX_SIZE = 512 * 1024;
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  if (file.size > MAX_SIZE) throw new Error("La imagen no puede superar 512 KB");
  if (!ALLOWED.includes(file.type)) throw new Error("Formato no admitido. Usa JPG, PNG o WebP");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${authUserId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// CARD CREATION WITH DB seq_id
// ============================================================

export async function createCard(card: Card, projectPrefix: string, actorUserId?: string): Promise<Card> {
  const payload = {
    id: card.id, card_id: card.card_id, board_id: card.board_id,
    col_id: card.col_id, state_id: card.state_id, title: card.title,
    description: card.description, type: card.type, category: card.category,
    due_date: card.due_date || null, blocked: card.blocked, creator_id: card.creator_id,
    attachments: card.attachments, comments: card.comments, history: card.history,
    depends_on: card.depends_on, blocked_by: card.blocked_by,
    time_per_col: card.time_per_col, col_since: card.col_since,
    created_at: card.created_at, completed_at: card.completed_at, discarded_at: card.discarded_at,
  };
  const { data: inserted, error } = await supabase.from("cards").insert(payload).select("seq_id").single();
  if (error) {
    console.error("createCard insert error:", error);
    await saveCard(card, actorUserId);
    return card;
  }
  const seqId = (inserted as { seq_id?: number }).seq_id;
  const finalCardId = seqId ? `${projectPrefix.toUpperCase()}-${seqId}` : card.card_id;
  if (seqId) await supabase.from("cards").update({ card_id: finalCardId }).eq("id", card.id);
  const finalCard: Card = { ...card, card_id: finalCardId, seq_id: seqId ?? null };
  if (actorUserId) {
    const companyId = await resolveBoardCompany(card.board_id);
    if (companyId) {
      await logBoardChange({ company_id: companyId, board_id: card.board_id, user_id: actorUserId, entity_id: card.id, entity_type: "card", change: "card_create" });
    }
  }
  return finalCard;
}
