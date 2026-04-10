import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { FONT, PHASE_COLORS, SUPER_ADMIN_EMAIL } from "./constants";
import { ThemeContext, ThemeModeContext, resolveTheme, usePrefersDark } from "./hooks/useTheme";
import type { ThemeMode } from "./hooks/useTheme";
import {
  acceptPendingInvites,
  createCard,
  ensureUserProfile,
  loadBoardData,
  loadBoardsForProject,
  loadCompanyBackups,
  loadCompanySettings,
  loadFeatureCatalog,
  loadProjectMembers,
  loadProjectUsers,
  loadProjects,
  loadUserCompanies,
  loadWorkspaces,
  resolveBoardByNumericId,
  resolveCompanyFeatureFlags,
  resolveWorkspaceByNumericId,
  saveBoard,
  saveCard,
  saveColumn,
  saveState,
  seedBoardForProject,
  createCompanyBackup,
  saveCompanySettings,
  setCompanyFeature,
  saveUserUiConfig,
} from "./lib/db";
import { supabase } from "./lib/supabase";
import { daysSince, formatDur, genPrefix, histEntry, uid, getUserFullName } from "./lib/utils";
import { CardModal } from "./components/CardModal";
import { ImprovementsPage } from "./components/ImprovementsPage";
import { JustifyModal } from "./components/JustifyModal";
import { KCard } from "./components/KCard";
import { LoginPage } from "./components/LoginPage";
import { NewKanbanModal } from "./components/NewKanbanModal";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ComponentSettingsListPage } from "./components/settings/ComponentSettingsListPage";
import { ComponentSettingsPage } from "./components/settings/ComponentSettingsPage";
import { SuperAdminPage } from "./components/admin/SuperAdminPage";
import { CompanyAdminPage } from "./admin/CompanyAdminPage";
import { PhaseLegend } from "./components/layout/PhaseLegend";
import { SecondaryBar } from "./components/layout/SecondaryBar";
import { SecondaryBarEditor } from "./components/layout/SecondaryBarEditor";
import { EmpresaPage } from "./components/EmpresaPage";
import { ProfilePage } from "./components/ProfilePage";
import { UserProfilePanel } from "./components/UserProfilePanel";
import { Avatar } from "./components/ui/Avatar";
import type {
  Board,
  BoardColumn,
  BoardState,
  Card,
  Company,
  CompanyBackup,
  CompanyRole,
  CompanySettings,
  Feature,
  FeatureFlags,
  Project,
  ProjectMember,
  User,
  Workspace,
} from "./types";
import { LangContext, translate, type Lang, type TranslationKey } from "./i18n";
type AppPage = "board" | "settings" | "improvements" | "admin" | "company-admin" | "component-settings-list" | "component-settings" | "profile" | "company";

export default function App() {
  const prefersDark = usePrefersDark();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = location.pathname.startsWith("/app") ? "/app" : "";
  const { boardNumericId, workspaceNumericId, openCardId, companyId, workspaceId, projectId, boardId, cardId, componentId, companyCode } = useParams<{
    boardNumericId?: string;
    workspaceNumericId?: string;
    openCardId?: string;
    companyId?: string;
    workspaceId?: string;
    projectId?: string;
    boardId?: string;
    cardId?: string;
    componentId?: string;
    companyCode?: string;
  }>();

  const [lang, setLang] = useState<Lang>("es");
  const t = useMemo(
    () => (key: TranslationKey, params?: Record<string, string | number>) => translate(key, lang, params),
    [lang],
  );

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [profileOpen, setProfileOpen] = useState(false);

  const [companyLinks, setCompanyLinks] = useState<Array<{ company: Company; role: CompanyRole }>>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRole>("member");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<Feature[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [companyBackups, setCompanyBackups] = useState<CompanyBackup[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({});
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [routeTarget, setRouteTarget] = useState<{
    companyId?: string | null;
    workspaceId?: string | null;
    projectId?: string | null;
    boardId?: string | null;
    openCardId?: string | null;
  } | null>(null);

  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [states, setStates] = useState<BoardState[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [page, setPage] = useState<AppPage>("board");
  const [modal, setModal] = useState<Card | null>(null);
  const [justifyPending, setJustifyPending] = useState<{ cardId: string; colId: string; stateId: string; isDiscard?: boolean } | null>(null);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [showNewKanban, setShowNewKanban] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [secondaryOrder, setSecondaryOrder] = useState<string[]>([]);
  const [secondaryEditorOpen, setSecondaryEditorOpen] = useState(false);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [topMenuIndex, setTopMenuIndex] = useState(0);
  const [topMenuHover, setTopMenuHover] = useState<string | null>(null);

  const dragCardId = useRef<string | null>(null);
  const topMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const topMenuListRef = useRef<HTMLDivElement | null>(null);
  const topMenuItemRefs = useRef<HTMLButtonElement[]>([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [activeMobileColIdx, setActiveMobileColIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!topMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (topMenuListRef.current?.contains(target)) return;
      if (topMenuButtonRef.current?.contains(target)) return;
      setTopMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [topMenuOpen]);

  useEffect(() => { setActiveMobileColIdx(0); }, [activeBoardId]);

  const userThemeKey = currentUser?.email ? `kanban-pro:theme:${currentUser.email.toLowerCase()}` : null;
  const T = resolveTheme(themeMode, prefersDark);

  useEffect(() => {
    if (!userThemeKey) {
      setThemeMode("system");
      return;
    }
    const stored = window.localStorage.getItem(userThemeKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeMode(stored);
      return;
    }
    setThemeMode("system");
  }, [userThemeKey]);

  useEffect(() => {
    if (!userThemeKey) return;
    window.localStorage.setItem(userThemeKey, themeMode);
  }, [themeMode, userThemeKey]);

  useEffect(() => {
    const stored = window.localStorage.getItem("kanban-pro:lang:last");
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kanban-pro:lang:last", lang);
  }, [lang]);

  useEffect(() => {
    if (!currentUser?.lang) return;
    setLang(currentUser.lang as Lang);
  }, [currentUser?.lang]);

  useEffect(() => {
    const isComponentRoute = location.pathname.includes("/config/components");
    const isProfileRoute = location.pathname.endsWith("/perfil") || location.pathname.endsWith("/perfil/");
    const isCompanyRoute = location.pathname.includes("/empresa/");
    if (isComponentRoute) {
      setPage(componentId ? "component-settings" : "component-settings-list");
      return;
    }
    if (isProfileRoute) {
      setPage("profile");
      return;
    }
    if (isCompanyRoute) {
      setPage("company");
      return;
    }
    if (page === "component-settings" || page === "component-settings-list") {
      setPage("board");
    }
    if (page === "profile" && !isProfileRoute) {
      setPage("board");
    }
    if (page === "company" && !isCompanyRoute) {
      setPage("board");
    }
  }, [location.pathname, componentId, page]);

  useEffect(() => {
    const config = (currentUser?.ui_config as { secondaryBar?: string[] } | undefined)?.secondaryBar;
    if (Array.isArray(config) && config.length) {
      setSecondaryOrder(config);
      return;
    }
    setSecondaryOrder(["newCard", "newBoard", "metrics", "filters", "wip", "improvements", "settings", "companyAdmin", "admin"]);
  }, [currentUser?.ui_config]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setCurrentUser(null);
      setCompanyLinks([]);
      setCompany(null);
      setCompanyRole("member");
      setWorkspaces([]);
      setProjects([]);
      setProjectMembers([]);
      setFeatureCatalog([]);
      setCompanySettings(null);
      setCompanyBackups([]);
      setFeatureFlags({});
      setBoards([]);
      setColumns([]);
      setStates([]);
      setUsers([]);
      setCards([]);
      setActiveCompanyId(null);
      setActiveWorkspaceId(null);
      setActiveProjectId(null);
      setActiveBoardId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const profile = await ensureUserProfile(session.user);
      await acceptPendingInvites(profile);
      const links = await loadUserCompanies(profile.id);
      if (cancelled) return;
      setCurrentUser(profile);
      setCompanyLinks(links);
      const firstCompany = links[0]?.company || null;
      setActiveCompanyId(firstCompany?.id || null);
      setCompany(firstCompany);
      setCompanyRole(links[0]?.role || "member");
      if (!firstCompany) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const state = (location.state || {}) as Partial<{
      companyId: string;
      workspaceId: string;
      projectId: string;
    }>;

    (async () => {
      if (boardNumericId) {
        const numeric = Number(boardNumericId);
        if (!Number.isNaN(numeric)) {
          const board = await resolveBoardByNumericId(numeric);
          if (cancelled) return;
          if (board) {
            setRouteTarget({
              companyId: board.company_id,
              projectId: board.project_id,
              boardId: board.id,
              openCardId: openCardId || null,
            });
            return;
          }
        }
      }

      if (workspaceNumericId) {
        const numeric = Number(workspaceNumericId);
        if (!Number.isNaN(numeric)) {
          const ws = await resolveWorkspaceByNumericId(numeric);
          if (cancelled) return;
          if (ws) {
            setRouteTarget({
              companyId: ws.company_id,
              workspaceId: ws.id,
            });
            return;
          }
        }
      }

      if (companyId && projectId && boardId) {
        let resolvedWorkspaceId = workspaceId || null;
        if (!resolvedWorkspaceId) {
          const { data: projectRow } = await supabase.from("projects").select("workspace_id").eq("id", projectId).maybeSingle();
          resolvedWorkspaceId = (projectRow as { workspace_id?: string } | null)?.workspace_id || null;
        }
        if (cancelled) return;
        setRouteTarget({
          companyId,
          workspaceId: resolvedWorkspaceId,
          projectId,
          boardId,
          openCardId: cardId || null,
        });
        return;
      }

      if (state.companyId || state.workspaceId || state.projectId || openCardId) {
        setRouteTarget({
          companyId: state.companyId || null,
          workspaceId: state.workspaceId || null,
          projectId: state.projectId || null,
          openCardId: openCardId || null,
        });
        return;
      }

      setRouteTarget(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, boardNumericId, workspaceNumericId, openCardId, companyId, workspaceId, projectId, boardId, cardId, location.state]);

  useEffect(() => {
    if (!currentUser || !activeCompanyId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const [workspacesRes, featureCatalogRes, settings, backups] = await Promise.all([
        loadWorkspaces(activeCompanyId),
        loadFeatureCatalog(),
        loadCompanySettings(activeCompanyId),
        loadCompanyBackups(activeCompanyId),
      ]);
      const featureFlagsRes = await resolveCompanyFeatureFlags(activeCompanyId);
      if (cancelled) return;

      setWorkspaces(workspacesRes);
      setFeatureCatalog(featureCatalogRes);
      setCompanySettings(settings);
      setCompanyBackups(backups);
      setFeatureFlags(featureFlagsRes);

      const wsId = workspacesRes[0]?.id || null;
      setActiveWorkspaceId(wsId);
      if (!wsId) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, currentUser]);

  useEffect(() => {
    if (!routeTarget?.workspaceId) return;
    if (workspaces.length === 0) return;
    if (routeTarget.workspaceId !== activeWorkspaceId) {
      const exists = workspaces.some(w => w.id === routeTarget.workspaceId);
      if (exists) setActiveWorkspaceId(routeTarget.workspaceId);
    }
  }, [routeTarget?.workspaceId, workspaces, activeWorkspaceId]);

  useEffect(() => {
    if (!activeCompanyId) {
      setCompany(null);
      setCompanyRole("member");
      return;
    }
    const link = companyLinks.find(item => item.company.id === activeCompanyId) || null;
    setCompany(link?.company || null);
    setCompanyRole(link?.role || "member");
  }, [activeCompanyId, companyLinks]);

  useEffect(() => {
    if (!routeTarget?.companyId) return;
    if (routeTarget.companyId !== activeCompanyId) {
      setActiveCompanyId(routeTarget.companyId);
      setActiveWorkspaceId(null);
      setActiveProjectId(null);
      setActiveBoardId(null);
    }
  }, [routeTarget?.companyId, activeCompanyId]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setProjects([]);
      setActiveProjectId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const projectsRes = await loadProjects(activeWorkspaceId);
      if (cancelled) return;
      setProjects(projectsRes);
      setActiveProjectId(projectsRes[0]?.id || null);
      if (!projectsRes.length) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!routeTarget?.projectId) return;
    if (projects.length === 0) return;
    if (routeTarget.projectId !== activeProjectId) {
      const exists = projects.some(p => p.id === routeTarget.projectId);
      if (exists) setActiveProjectId(routeTarget.projectId);
    }
  }, [routeTarget?.projectId, projects, activeProjectId]);

  useEffect(() => {
    if (!currentUser || !activeProjectId) {
      setBoards([]);
      setStates([]);
      setColumns([]);
      setUsers([]);
      setCards([]);
      setActiveBoardId(null);
      setProjectMembers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      let boardsRes = await loadBoardsForProject(activeProjectId);
      if (!boardsRes.length) {
        await seedBoardForProject(activeProjectId, currentUser);
        boardsRes = await loadBoardsForProject(activeProjectId);
      }
      const activeBoard = boardsRes[0] || null;
      const boardData = activeBoard ? await loadBoardData(activeBoard.id) : { states: [], columns: [], cards: [], users: [] };
      const [members, projectUsers] = await Promise.all([
        loadProjectMembers(activeProjectId),
        loadProjectUsers(activeProjectId),
      ]);

      if (cancelled) return;
      setBoards(boardsRes);
      setProjectMembers(members);
      setStates(boardData.states);
      setColumns(boardData.columns);
      setCards(boardData.cards);
      setUsers(projectUsers.length ? projectUsers : boardData.users);
      setActiveBoardId(activeBoard?.id || null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, currentUser]);

  useEffect(() => {
    if (!routeTarget?.boardId) return;
    if (boards.length === 0) return;
    if (routeTarget.boardId !== activeBoardId) {
      const exists = boards.some(b => b.id === routeTarget.boardId);
      if (exists) setActiveBoardId(routeTarget.boardId);
    }
  }, [routeTarget?.boardId, boards, activeBoardId]);

  useEffect(() => {
    if (!currentUser || !activeProjectId || !activeBoardId) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const boardData = await loadBoardData(activeBoardId);
      const projectUsers = await loadProjectUsers(activeProjectId);
      if (cancelled) return;
      setStates(boardData.states);
      setColumns(boardData.columns);
      setCards(boardData.cards);
      setUsers(projectUsers.length ? projectUsers : boardData.users);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBoardId, activeProjectId, currentUser]);

  useEffect(() => {
    if (!routeTarget?.openCardId) return;
    const card = cards.find(c => c.id === routeTarget.openCardId || c.card_id === routeTarget.openCardId);
    if (card) {
      setModal(card);
      setRouteTarget(prev => (prev ? { ...prev, openCardId: null } : prev));
    }
  }, [routeTarget?.openCardId, cards]);

  useEffect(() => {
    if (!activeBoardId) return;
    const ch = supabase.channel("cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${activeBoardId}` }, payload => {
        if (payload.eventType === "INSERT") setCards(cs => [...cs, payload.new as Card]);
        if (payload.eventType === "UPDATE") setCards(cs => cs.map(c => c.id === (payload.new as Card).id ? payload.new as Card : c));
        if (payload.eventType === "DELETE") setCards(cs => cs.filter(c => c.id !== (payload.old as Card).id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeBoardId]);

  useEffect(() => {
    if (featureFlags.metrics === false) {
      setShowMetrics(false);
    }
  }, [featureFlags.metrics]);

  const board = boards.find(b => b.id === activeBoardId) || boards[0] || null;
  const boardUrlId = board?.numeric_id ?? board?.id;
  const hasHierarchy = !!(activeCompanyId && activeProjectId && activeBoardId);
  const boardUrl = hasHierarchy
    ? `${basePath}/${activeCompanyId}${activeWorkspaceId ? `/${activeWorkspaceId}` : ""}/${activeProjectId}/${activeBoardId}`
    : (boardUrlId ? `${basePath}/board/${boardUrlId}` : `${basePath}/`);
  const profileUrl = basePath ? `${basePath}/perfil` : "/perfil";
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const myProjectRole = projectMembers.find(m => m.user_id === currentUser?.id)?.role || "member";
  const isCompanyOwner = !!(company && currentUser && (company.owner_id === currentUser.id || company.owner_user_id === currentUser.id));
  const discardStateIds = new Set(states.filter(s => s.is_discard).map(s => s.id));
  const wipCols = columns.filter(c => c.is_wip);
  const doneColIds = columns.filter(c => c.phase === "post").map(c => c.id);
  const activeCards = cards.filter(c => !discardStateIds.has(c.state_id));
  const completedCards = activeCards.filter(c => c.completed_at && doneColIds.includes(c.col_id));
  const leadTimes = completedCards.map(c => new Date(c.completed_at!).getTime() - new Date(c.created_at).getTime()).filter(v => v > 0);
  const avgLead = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
  const cycleTimes = activeCards.map(c => {
    const tpc = { ...c.time_per_col };
    if (wipCols.some(w => w.id === c.col_id)) tpc[c.col_id] = (tpc[c.col_id] || 0) + (Date.now() - (c.col_since || Date.now()));
    return wipCols.reduce((a, w) => a + (tpc[w.id] || 0), 0);
  }).filter(v => v > 0);
  const avgCycle = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
  const throughput = completedCards.filter(c => new Date(c.completed_at!).getTime() >= Date.now() - 7 * 24 * 3600000).length;
  const wipTotal = cards.filter(c => wipCols.some(w => w.id === c.col_id) && !discardStateIds.has(c.state_id)).length;
  const wipLimitTotal = wipCols.reduce((acc, col) => acc + (col.wip_limit || 0), 0);

  const metricDefs = [
    { label: t("metrics.leadTime"), value: formatDur(avgLead), color: T.accent, hint: leadTimes.length ? t("metrics.completedCount", { count: leadTimes.length }) : t("metrics.noData") },
    { label: t("metrics.cycleTime"), value: formatDur(avgCycle), color: T.warning, hint: wipCols.map(c => c.name).join(", ") || t("metrics.noWip") },
    { label: t("metrics.throughput"), value: String(throughput), color: T.success, hint: t("metrics.last7Days") },
  ];

  const burnSeries = (() => {
    const days = 14;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const keys: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(d.toISOString().slice(0, 10));
    }
    const createdByDay = new Map<string, number>();
    const doneByDay = new Map<string, number>();
    for (const c of cards) {
      if (c.discarded_at) continue;
      const createdKey = c.created_at?.slice(0, 10);
      if (createdKey && keys.includes(createdKey)) createdByDay.set(createdKey, (createdByDay.get(createdKey) || 0) + 1);
      const doneKey = c.completed_at?.slice(0, 10);
      if (doneKey && keys.includes(doneKey)) doneByDay.set(doneKey, (doneByDay.get(doneKey) || 0) + 1);
    }
    let created = 0;
    let done = 0;
    const createdSeries: number[] = [];
    const doneSeries: number[] = [];
    keys.forEach(k => {
      created += createdByDay.get(k) || 0;
      done += doneByDay.get(k) || 0;
      createdSeries.push(created);
      doneSeries.push(done);
    });
    const remainingSeries = createdSeries.map((c, i) => Math.max(0, c - doneSeries[i]));
    return { keys, createdSeries, doneSeries, remainingSeries };
  })();

  function seriesPath(values: number[], width: number, height: number) {
    if (!values.length) return "";
    const max = Math.max(...values, 1);
    return values.map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }

  const filters = [
    { id: "mine", label: t("filters.mine"), fn: (c: Card) => c.creator_id === currentUser?.id },
    { id: "recent", label: t("filters.last24h"), fn: (c: Card) => { const l = c.history[c.history.length - 1]; try { return l && (Date.now() - new Date(l.ts).getTime()) < 86400000; } catch { return false; } } },
    { id: "blocked", label: t("filters.blocked"), fn: (c: Card) => c.blocked },
    { id: "overdue", label: t("filters.overdue"), fn: (c: Card) => !!c.due_date && new Date(c.due_date) < new Date() },
  ];

  const isSuperAdmin = currentUser?.email === SUPER_ADMIN_EMAIL;

  const secondaryActions = page === "board" ? [
    { id: "newCard", label: t("menu.newCard"), onClick: () => { void newCard(); } },
    { id: "newBoard", label: t("menu.newBoard"), onClick: () => setShowNewKanban(true) },
    ...(featureFlags.metrics ? [{ id: "metrics", label: t("menu.metrics"), onClick: () => setShowMetrics(v => !v), active: showMetrics }] : []),
    ...(featureFlags.filters ? [{ id: "filters", label: t("filters.toggle"), onClick: () => setShowFilters(v => !v), active: showFilters }] : []),
    ...(featureFlags.wip && wipCols.length > 0 ? [{ id: "wip", label: t("board.wip", { current: wipTotal, limit: wipLimitTotal || t("board.wipUnlimited") }), disabled: true }] : []),
    ...(featureFlags.improvements ? [{ id: "improvements", label: t("menu.improvements"), onClick: () => setPage("improvements") }] : []),
    { id: "settings", label: t("menu.settings"), onClick: () => setPage("settings") },
    ...(featureFlags.company_admin_console && companyRole === "company_admin" ? [{ id: "companyAdmin", label: t("menu.companyAdmin"), onClick: () => setPage("company-admin") }] : []),
    ...(isSuperAdmin ? [{ id: "admin", label: t("menu.admin"), onClick: () => setPage("admin") }] : []),
  ] : [];

  const topMenuActions = [
    { id: "profile", label: t("menu.openProfile"), onClick: () => navigate(profileUrl) },
    { id: "settings", label: t("menu.settings"), onClick: () => setPage("settings") },
    ...(isCompanyOwner ? [{ id: "companyAdmin", label: t("menu.companyAdmin"), onClick: () => setPage("company-admin") }] : []),
    ...(isSuperAdmin ? [{ id: "admin", label: t("menu.admin"), onClick: () => setPage("admin") }] : []),
    { id: "logout", label: t("menu.logout"), onClick: handleLogout },
  ];

  useEffect(() => {
    if (!topMenuOpen) return;
    setTopMenuIndex(0);
    requestAnimationFrame(() => {
      topMenuItemRefs.current[0]?.focus();
    });
  }, [topMenuOpen, topMenuActions.length]);

  function cardVisible(c: Card) {
    const hide = board?.board_config?.hideDoneAfterDays || 0;
    if (hide > 0 && c.completed_at && daysSince(new Date(c.completed_at).getTime()) >= hide) return false;
    if (!featureFlags.filters || !activeFilters.length) return true;
    return activeFilters.every(fid => {
      const filter = filters.find(x => x.id === fid);
      return filter ? filter.fn(c) : true;
    });
  }

  function openCard(id: string) {
    setModal(cards.find(c => c.id === id) || null);
    if (boardUrlId) {
      navigate(hasHierarchy ? `${boardUrl}/${id}` : `${boardUrl}/card/${id}`, { replace: true });
    }
  }

  async function onSaveCard(updated: Card) {
    if (!currentUser) return;
    const prev = cards.find(c => c.id === updated.id);
    if (prev && prev.col_id !== updated.col_id) {
      const elapsed = Date.now() - (prev.col_since || Date.now());
      const tpc = { ...prev.time_per_col };
      tpc[prev.col_id] = (tpc[prev.col_id] || 0) + elapsed;
      updated = { ...updated, time_per_col: tpc, col_since: Date.now() };
    }
    setCards(cs => cs.map(c => c.id === updated.id ? updated : c));
    setModal(null);
    if (boardUrlId) navigate(boardUrl, { replace: true });
    await saveCard(updated, currentUser.id);
  }

  async function newCard() {
    if (!board || !columns.length || !currentUser || !activeProject) return;
    const firstCol = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids || []).includes(s.id)) || states[0];
    const tmpId = `${activeProject.prefix.toUpperCase()}-${Date.now()}`;
    const c: Card = {
      id: uid(),
      card_id: tmpId,
      board_id: board.id,
      col_id: firstCol?.id,
      state_id: firstState?.id,
      title: t("card.defaultTitle"),
      type: "tarea",
      category: board.categories[0] || t("card.defaultCategory"),
      due_date: "",
      blocked: false,
      creator_id: currentUser.id,
      description: "",
      attachments: [],
      comments: [],
      history: [histEntry(t("history.cardCreated"), currentUser, lang)],
      depends_on: [],
      blocked_by: [],
      time_per_col: {},
      col_since: Date.now(),
      created_at: new Date().toISOString(),
      completed_at: null,
      discarded_at: null,
    };
    const created = await createCard(c, activeProject.prefix, currentUser.id);
    setCards(cs => [created, ...cs]);
    setModal(created);
  }

  async function handleSaveSecondaryBar(nextOrder: string[]) {
    if (!currentUser) return;
    const nextConfig = { ...(currentUser.ui_config || {}), secondaryBar: nextOrder };
    setSecondaryOrder(nextOrder);
    setSecondaryEditorOpen(false);
    setCurrentUser({ ...currentUser, ui_config: nextConfig });
    await saveUserUiConfig(currentUser.id, nextConfig);
  }

  function onDragStart(e: React.DragEvent, id: string) {
    dragCardId.current = id;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.stopPropagation();
    const id = dragCardId.current;
    dragCardId.current = null;
    if (!id) return;
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const colCards = cards.filter(c => c.col_id === colId);
    if (col.wip_limit > 0 && colCards.length >= col.wip_limit && card.col_id !== colId) return;
    const newStateId = (col.state_ids || [])[0] || states[0]?.id;
    const newState = states.find(s => s.id === newStateId);
    const prevState = states.find(s => s.id === card.state_id);
    const needsJustify = (prevState?.phase === "post" || prevState?.is_discard) && newState?.phase !== "post" && !newState?.is_discard;
    const movingDiscard = !!newState?.is_discard && !prevState?.is_discard;
    if (needsJustify || movingDiscard) {
      setJustifyPending({ cardId: id, colId, stateId: newStateId, isDiscard: movingDiscard });
      return;
    }
    await applyDrop(id, colId, newStateId, null);
  }

  async function applyDrop(cardId: string, colId: string, stateId: string, reason: string | null) {
    if (!currentUser) return;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const newState = states.find(s => s.id === stateId);
    const elapsed = Date.now() - (card.col_since || Date.now());
    const tpc = { ...card.time_per_col };
    tpc[card.col_id] = (tpc[card.col_id] || 0) + elapsed;
    const hist = [...card.history];
    if (reason) hist.push(histEntry(t("history.justification", { reason }), currentUser, lang));
    hist.push(histEntry(
      t("history.movedTo", { column: columns.find(c => c.id === colId)?.name || "", state: newState?.name || "" }),
      currentUser,
      lang,
    ));
    const isDone = newState?.phase === "post" && !newState?.is_discard;
    const isDiscard = !!newState?.is_discard;
    const updated: Card = {
      ...card,
      col_id: colId,
      state_id: stateId,
      time_per_col: tpc,
      col_since: Date.now(),
      history: hist,
      completed_at: isDone && !card.completed_at ? new Date().toISOString() : (!isDone && !isDiscard ? null : card.completed_at),
      discarded_at: isDiscard ? new Date().toISOString() : null,
    };
    setCards(cs => cs.map(c => c.id === cardId ? updated : c));
    setJustifyPending(null);
    await saveCard(updated, currentUser.id);
  }

  async function createBoard(title: string, mode: string) {
    if (!currentUser || !company || !activeProjectId) return;
    const isEn = lang === "en";
    const prefix = genPrefix(title);
    const id = uid();
    const boardOwner = activeProject?.owner_id || currentUser.id;
    const nb = {
      id,
      company_id: company.id,
      project_id: activeProjectId,
      title,
      prefix,
      card_seq: 0,
      owner_user_id: boardOwner,
      board_config: { public: false, requireLogin: true, hideDoneAfterDays: 0 },
      visible_fields: [],
      categories: mode === "copy" ? [...(board?.categories || [])] : [t("board.categoryFrontend"), t("board.categoryBackend")],
      created_at: new Date().toISOString(),
      sort_order: boards.length,
    } as unknown as Board;
    const newCols: BoardColumn[] = mode === "copy"
      ? columns.map(c => ({ ...c, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: isEn ? "To do" : "Por hacer", phase: "pre", state_ids: [], wip_limit: 0, is_wip: false, sort_order: 0 },
          { id: uid(), board_id: id, name: isEn ? "In progress" : "En progreso", phase: "work", state_ids: [], wip_limit: 3, is_wip: true, sort_order: 1 },
          { id: uid(), board_id: id, name: isEn ? "Done" : "Hecho", phase: "post", state_ids: [], wip_limit: 0, is_wip: false, sort_order: 2 },
        ];
    const newStates: BoardState[] = mode === "copy"
      ? states.map(s => ({ ...s, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: isEn ? "Pending" : "Pendiente", phase: "pre", is_discard: false, sort_order: 0 },
          { id: uid(), board_id: id, name: isEn ? "In progress" : "En curso", phase: "work", is_discard: false, sort_order: 1 },
          { id: uid(), board_id: id, name: isEn ? "Done" : "Completado", phase: "post", is_discard: false, sort_order: 2 },
        ];
    await saveBoard(nb, currentUser.id);
    await Promise.all(newCols.map(col => saveColumn(col, currentUser.id)));
    await Promise.all(newStates.map(state => saveState(state, currentUser.id)));
    setBoards(bs => [...bs, nb]);
    setColumns(newCols);
    setStates(newStates);
    setCards([]);
    setActiveBoardId(id);
    setShowNewKanban(false);
  }

  async function onSaveCat(cat: string) {
    if (!board || !currentUser || board.categories.includes(cat)) return;
    const updated = { ...board, categories: [...board.categories, cat] };
    setBoards(bs => bs.map(b => b.id === board.id ? updated : b));
    await saveBoard(updated, currentUser.id);
  }

  async function handleGoogleLogin() {
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) {
      console.error("Google login error:", error);
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    window.location.href = "https://kanban-incrzyulw-kanban-pro.vercel.app/";
  }

  function withTheme(content: ReactNode) {
    return (
      <ThemeModeContext.Provider value={{ mode: themeMode, setMode: setThemeMode }}>
        <ThemeContext.Provider value={T}>
          <LangContext.Provider value={{ lang, setLang }}>
            {content}
          </LangContext.Provider>
        </ThemeContext.Provider>
      </ThemeModeContext.Provider>
    );
  }

  if (authLoading) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
        {t("app.preparingAccess")}
      </div>,
    );
  }

  if (!session?.user) {
    return withTheme(<LoginPage onGoogleLogin={handleGoogleLogin} authBusy={authBusy} />);
  }

  if (loading) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: T.accent }}>[]</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.textSoft, margin: 0 }}>{t("app.loadingApp")}</p>
        </div>
      </div>,
    );
  }

  let headerTitle = board?.title || t("app.brand");
  let headerSubtitle = activeProject?.name || "";
  let mainContent: ReactNode;

  if (page === "component-settings-list") {
    headerTitle = "Configuracion de componentes";
    headerSubtitle = "";
    mainContent = <ComponentSettingsListPage basePath={basePath} />;
  } else if (page === "component-settings" && componentId) {
    headerTitle = "Configuracion de componentes";
    headerSubtitle = componentId;
    mainContent = <ComponentSettingsPage basePath={basePath} componentId={componentId} />;
  } else if (page === "profile" && currentUser) {
    headerTitle = t("menu.openProfile");
    headerSubtitle = currentUser.email;
    mainContent = (
      <ProfilePage
        user={currentUser}
        themeMode={themeMode}
        onThemeChange={setThemeMode}
        onSaved={updated => {
          setCurrentUser(updated);
          if (updated.lang) setLang(updated.lang as Lang);
        }}
        onBack={() => navigate(boardUrl || basePath || "/")}
      />
    );
  } else if (page === "company" && currentUser && companyCode) {
    headerTitle = "Empresa";
    headerSubtitle = companyCode.toUpperCase();
    mainContent = (
      <EmpresaPage
        companyCode={companyCode}
        currentUser={currentUser}
        companyLinks={companyLinks}
        onBack={() => navigate(boardUrl || basePath || "/")}
      />
    );
  } else if (page === "admin" && isSuperAdmin && currentUser) {
    headerTitle = t("menu.admin");
    headerSubtitle = "";
    mainContent = <SuperAdminPage currentUser={currentUser} onBack={() => setPage("board")} />;
  } else if (page === "company-admin" && currentUser && company && featureFlags.company_admin_console && companyRole === "company_admin") {
    headerTitle = t("menu.companyAdmin");
    headerSubtitle = company.name;
    mainContent = (
      <CompanyAdminPage
        currentUser={currentUser}
        company={company}
        companyRole={companyRole}
        featureFlags={featureFlags}
        onBack={() => setPage("board")}
      />
    );
  } else if (!company) {
    headerTitle = t("app.noCompanyTitle");
    headerSubtitle = "";
    mainContent = (
      <div style={{ minHeight: "100vh", background: T.bgSoft, padding: 24, fontFamily: FONT }}>
        {isSuperAdmin && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setPage("admin")}
              style={{ fontSize: 13, fontWeight: 700, padding: "10px 16px", borderRadius: 12, border: `1px solid ${T.accent}`, backgroundColor: T.accentSoft, color: T.accent, cursor: "pointer" }}
            >
              {t("menu.openAdminConsole")}
            </button>
          </div>
        )}
        <p style={{ color: T.text, fontWeight: 700 }}>{t("app.noCompanyTitle")}</p>
        <p style={{ color: T.textSoft, fontSize: 13 }}>{t("app.noCompanyBody")}</p>
      </div>
    );
  } else if (page === "improvements" && currentUser && company && featureFlags.improvements) {
    headerTitle = t("menu.improvements");
    headerSubtitle = company.name;
    mainContent = <ImprovementsPage currentUser={currentUser} companyId={company.id} onBack={() => setPage("board")} />;
  } else if (page === "settings" && board && currentUser && company) {
    headerTitle = t("menu.settings");
    headerSubtitle = company.name;
    mainContent = (
      <div style={{ position: "relative" }}>
        <SettingsPage
          board={board}
          project={activeProject}
          columns={columns}
          states={states}
          projectMembers={projectMembers}
          currentUser={currentUser}
          myRole={companyRole}
          myProjectRole={myProjectRole}
          company={company}
          companySettings={companySettings}
          companyBackups={companyBackups}
          featureFlags={featureFlags}
          featureCatalog={featureCatalog}
          activeProjectId={activeProjectId}
          onBack={() => setPage("board")}
          onUpdateBoard={b => { setBoards(bs => bs.map(x => x.id === b.id ? b : x)); void saveBoard(b, currentUser.id); }}
          onUpdateColumns={setColumns}
          onUpdateStates={setStates}
          onUpdateProjectMembers={setProjectMembers}
          onUpdateFeatureFlag={(key, enabled) => {
            setFeatureFlags(prev => ({ ...prev, [key]: enabled }));
            if (company) {
              void setCompanyFeature(company.id, key, enabled, currentUser.id);
            }
          }}
          onUpdateCompanySettings={settings => { setCompanySettings(settings); void saveCompanySettings(settings); }}
          onCreateCompanyBackup={async summary => {
            if (!company) return;
            await createCompanyBackup(company.id, currentUser.id, summary);
            const refreshed = await loadCompanyBackups(company.id);
            setCompanyBackups(refreshed);
          }}
        />
      </div>
    );
  } else if (!board || !currentUser || !activeProject) {
    headerTitle = t("app.noBoards");
    headerSubtitle = "";
    mainContent = (
      <div style={{ minHeight: "100vh", background: T.bgSoft, padding: 24, fontFamily: FONT }}>
        <p style={{ color: T.text, fontWeight: 700 }}>{t("app.noBoards")}</p>
        {!activeProject && (
          <p style={{ color: T.textSoft, fontSize: 13 }}>
            {t("app.noProjectsBody")}
          </p>
        )}
      </div>
    );
  } else {
    mainContent = (
      <>
        {page === "board" && secondaryActions.length > 0 && (
          <SecondaryBar actions={secondaryActions} order={secondaryOrder} onEdit={() => setSecondaryEditorOpen(true)} />
        )}

        {isMobile && (
          <div style={{ display: "flex", padding: "0 12px", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {columns.map((col, i) => {
              const colColor = PHASE_COLORS[col.phase] || "#888";
              const active = i === activeMobileColIdx;
              const cnt = cards.filter(c => c.col_id === col.id && cardVisible(c)).length;
              return (
                <button key={col.id} onClick={() => setActiveMobileColIdx(i)}
                  style={{ flexShrink: 0, marginBottom: 10, fontSize: 11, fontWeight: 700, padding: "7px 12px", borderRadius: 10, border: `1px solid ${active ? colColor : T.border}`, backgroundColor: active ? `${colColor}18` : "transparent", color: active ? colColor : T.textSoft, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  {col.name}
                  <span style={{ fontSize: 10, background: active ? colColor : T.bgElevated, color: active ? "#fff" : T.textSoft, borderRadius: 999, padding: "1px 6px" }}>{cnt}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-header: metrics · filters */}
        <div style={{ flexShrink: 0 }}>
          {featureFlags.metrics && showMetrics && (
            <div style={{ padding: "8px 16px", display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" }}>
              {metricDefs.map(m => (
                <div key={m.label} style={{ backgroundColor: T.bgElevated, borderRadius: 14, border: `1px solid ${T.border}`, padding: "10px 14px", minWidth: isMobile ? 120 : 150, flexShrink: 0, boxShadow: T.shadowSm }}>
                  <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: T.textSoft }}>{m.label}</p>
                  <p style={{ margin: "0 0 2px", fontSize: isMobile ? 16 : 20, fontWeight: 800, color: m.color }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 9, color: T.textSoft }}>{m.hint}</p>
                </div>
              ))}
              {(featureFlags.metrics_burnup || featureFlags.metrics_burndown) && (
                <div style={{ backgroundColor: T.bgElevated, borderRadius: 14, border: `1px solid ${T.border}`, padding: "10px 14px", minWidth: isMobile ? 180 : 220, flexShrink: 0, boxShadow: T.shadowSm }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: T.textSoft }}>{t("board.advancedMetrics")}</p>
                  <svg width={isMobile ? 160 : 200} height={60} style={{ display: "block" }}>
                    {featureFlags.metrics_burnup && (
                      <path d={seriesPath(burnSeries.createdSeries, isMobile ? 160 : 200, 50)} stroke={T.warning} strokeWidth="2" fill="none" />
                    )}
                    {featureFlags.metrics_burndown && (
                      <path d={seriesPath(burnSeries.remainingSeries, isMobile ? 160 : 200, 50)} stroke={T.success} strokeWidth="2" fill="none" />
                    )}
                  </svg>
                  <div style={{ display: "flex", gap: 8, fontSize: 9, color: T.textSoft }}>
                    {featureFlags.metrics_burnup && <span>{t("metrics.burnup")}</span>}
                    {featureFlags.metrics_burndown && <span>{t("metrics.burndown")}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
          {featureFlags.filters && showFilters && (
            <div style={{ margin: "0 16px 8px", padding: "8px 12px", display: "flex", gap: 6, alignItems: "center", border: `1px solid ${T.border}`, borderRadius: 14, backgroundColor: T.bgSidebar, flexWrap: "wrap", backdropFilter: "blur(14px)" }}>
              {!isMobile && (["pre", "work", "post"] as const).map(phase => (
                <span key={phase} style={{ fontSize: 10, fontWeight: 700, color: PHASE_COLORS[phase], padding: "3px 8px", borderRadius: 999, background: `${PHASE_COLORS[phase]}14`, border: `1px solid ${PHASE_COLORS[phase]}40` }}>
                  {phase === "pre" ? t("filters.pre") : phase === "work" ? t("filters.work") : t("filters.post")}
                </span>
              ))}
              {!isMobile && <div style={{ width: 1, height: 14, background: T.border }} />}
              {filters.map(f => {
                const on = activeFilters.includes(f.id);
                return (
                  <button key={f.id} onClick={() => setActiveFilters(fs => on ? fs.filter(x => x !== f.id) : [...fs, f.id])}
                    style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, border: `1px solid ${on ? T.accent : T.border}`, backgroundColor: on ? T.accentSoft : "transparent", color: on ? T.accent : T.textSoft, cursor: "pointer" }}>
                    {f.label}
                  </button>
                );
              })}
              {activeFilters.length > 0 && (
                <button onClick={() => setActiveFilters([])}
                  style={{ fontSize: 11, fontWeight: 700, padding: "5px 8px", borderRadius: 999, border: "none", backgroundColor: "transparent", color: T.danger, cursor: "pointer" }}>
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {/* Board area */}
        {isMobile ? (
          (() => {
            const col = columns[activeMobileColIdx];
            if (!col) return null;
            const colColor = PHASE_COLORS[col.phase] || "#888";
            const colCards = cards.filter(c => c.col_id === col.id && cardVisible(c));
            const wipOver = col.is_wip && col.wip_limit > 0 && colCards.length > col.wip_limit;
            return (
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
                   onDragOver={onDragOver} onDrop={e => onDrop(e, col.id)}>
                <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: colColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: colColor, flex: 1, letterSpacing: 0.8 }}>{col.name.toUpperCase()}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: wipOver ? T.danger : T.textSoft, background: T.bgElevated, borderRadius: 999, padding: "3px 10px", border: `1px solid ${T.border}` }}>
                    {colCards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                  </span>
                  {wipOver && <span style={{ fontSize: 9, fontWeight: 800, color: T.danger, background: T.dangerSoft, borderRadius: 999, padding: "2px 7px" }}>{t("board.wipAlert")}</span>}
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px 16px", scrollbarWidth: "thin" }}>
                  {colCards.length === 0 && (
                    <div style={{ textAlign: "center", padding: "48px 0", color: T.textSoft, fontSize: 13, fontStyle: "italic", border: `1px dashed ${T.borderStrong}`, borderRadius: 18, background: T.bgElevated, margin: "4px 0" }}>
                      {t("board.noCardsColumn")}
                    </div>
                  )}
                  {colCards.map(card => (
                    <KCard key={card.id} card={card} columns={columns} states={states} users={users} allCards={cards} featureFlags={featureFlags} onOpen={openCard} onDragStart={onDragStart} />
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 10, padding: "12px 16px 14px", alignItems: "stretch" }}>
            {columns.map(col => {
              const colColor = PHASE_COLORS[col.phase] || "#888";
              const colCards = cards.filter(c => c.col_id === col.id && cardVisible(c));
              const wipOver = col.is_wip && col.wip_limit > 0 && colCards.length > col.wip_limit;
              const wipPct = col.wip_limit > 0 ? Math.min(100, (colCards.length / col.wip_limit) * 100) : 30;
              return (
                <div key={col.id} onDragOver={onDragOver} onDrop={e => onDrop(e, col.id)}
                  style={{ flex: 1, minWidth: 200, backgroundColor: T.bgColumn, borderRadius: 18, border: `1px solid ${wipOver ? T.danger : T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: T.shadowSm }}>
                  <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: colColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: colColor, letterSpacing: 0.6, flex: 1 }}>{col.name.toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: wipOver ? T.danger : T.textSoft, background: T.bgElevated, borderRadius: 999, padding: "3px 9px", border: `1px solid ${T.border}` }}>
                        {colCards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, height: 3, borderRadius: 999, background: `${colColor}20`, overflow: "hidden" }}>
                      <div style={{ width: `${wipPct}%`, height: "100%", borderRadius: 999, background: colColor, transition: "width .4s ease" }} />
                    </div>
                    {col.is_wip && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: wipOver ? T.danger : T.warning, background: wipOver ? T.dangerSoft : T.warningSoft, borderRadius: 999, padding: "2px 7px", marginTop: 6, display: "inline-block" }}>
                        WIP{wipOver ? ` — ${t("board.wipLimit")}` : ""}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: "8px", overflowY: "auto", flex: 1, scrollbarWidth: "thin" }}>
                    {colCards.length === 0 && (
                      <div style={{ textAlign: "center", padding: "24px 0", color: T.textSoft, fontSize: 12, fontStyle: "italic", border: `1px dashed ${T.borderStrong}`, borderRadius: 14, background: T.bgElevated }}>
                        {t("board.noCards")}
                      </div>
                    )}
                    {colCards.map(card => (
                      <KCard key={card.id} card={card} columns={columns} states={states} users={users} allCards={cards} featureFlags={featureFlags} onOpen={openCard} onDragStart={onDragStart} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {page === "board" && <PhaseLegend isMobile={isMobile} />}
      </>
    );
  }

  return withTheme(
    <div style={{ fontFamily: FONT, backgroundColor: T.bg, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", color: T.text }}>

      {/* Modals */}
      {modal && board && company && currentUser && (
        <CardModal
          card={modal}
          board={board}
          columns={columns}
          states={states}
          users={users}
          currentUser={currentUser}
          companyId={company.id}
          showImprovements={!!featureFlags.improvements}
          featureFlags={featureFlags}
          allCards={cards}
          categories={board.categories}
          onClose={() => {
            setModal(null);
            if (boardUrlId) navigate(boardUrl, { replace: true });
          }}
          onSave={onSaveCard}
          onSaveCat={onSaveCat}
          onOpenCard={openCard}
        />
      )}
      {justifyPending && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900, padding: 20 }}>
          <JustifyModal
            title={justifyPending.isDiscard ? t("justify.titleDiscard") : t("justify.titleReopen")}
            onConfirm={r => applyDrop(justifyPending.cardId, justifyPending.colId, justifyPending.stateId, r)}
            onCancel={() => setJustifyPending(null)}
          />
        </div>
      )}
      {showNewKanban && <NewKanbanModal onClose={() => setShowNewKanban(false)} onCreate={createBoard} />}
      <SecondaryBarEditor
        isOpen={secondaryEditorOpen}
        actions={secondaryActions.map(action => ({ id: action.id, label: action.label }))}
        order={secondaryOrder}
        onSave={handleSaveSecondaryBar}
        onClose={() => setSecondaryEditorOpen(false)}
      />
      {currentUser && (
        <UserProfilePanel
          user={currentUser}
          isOpen={profileOpen}
          isMobile={isMobile}
          themeMode={themeMode}
          onThemeChange={setThemeMode}
          onClose={() => setProfileOpen(false)}
          onSaved={updated => {
            setCurrentUser(updated);
            if (updated.lang) setLang(updated.lang as Lang);
            setProfileOpen(false);
          }}
        />
      )}


      {/* Mobile sidebar drawer */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: T.overlay }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 280, background: T.bgSidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}
               onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>{t("app.brand")}</div>
              <button
                onClick={() => { navigate(profileUrl); setMobileMenuOpen(false); }}
                style={{ fontSize: 12, color: T.textSoft, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                title={currentUser ? (getUserFullName(currentUser) || currentUser.name) : "Usuario"}
              >
                {currentUser ? (getUserFullName(currentUser) || currentUser.name) : "Usuario"}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
              {companyLinks.length > 1 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 5, letterSpacing: 0.5 }}>{t("menu.company").toUpperCase()}</div>
                  <select value={activeCompanyId || ""} onChange={e => { const v = e.target.value; setActiveCompanyId(v); setActiveWorkspaceId(null); setActiveProjectId(null); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); setMobileMenuOpen(false); }}
                    style={{ width: "100%", fontSize: 13, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none" }}>
                    {companyLinks.map(c => <option key={c.company.id} value={c.company.id}>{c.company.name}</option>)}
                  </select>
                </div>
              )}
              {featureFlags.workspaces && workspaces.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 5, letterSpacing: 0.5 }}>{t("menu.workspace").toUpperCase()}</div>
                  <select value={activeWorkspaceId || ""} onChange={e => { const v = e.target.value; setActiveWorkspaceId(v); setActiveProjectId(null); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); setMobileMenuOpen(false); }}
                    style={{ width: "100%", fontSize: 13, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none" }}>
                    {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              )}
              {projects.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 5, letterSpacing: 0.5 }}>{t("menu.project").toUpperCase()}</div>
                  <select value={activeProjectId || ""} onChange={e => { const v = e.target.value; setActiveProjectId(v); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); setMobileMenuOpen(false); }}
                    style={{ width: "100%", fontSize: 13, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none" }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 5, letterSpacing: 0.5 }}>{t("menu.board").toUpperCase()}</div>
                <select value={activeBoardId || ""} onChange={e => setActiveBoardId(e.target.value)}
                  style={{ width: "100%", fontSize: 13, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none" }}>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div style={{ height: 1, background: T.border }} />
              <button onClick={() => { setShowNewKanban(true); setMobileMenuOpen(false); }}
                style={{ textAlign: "left", fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 10, border: `1px dashed ${T.borderStrong}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
                {t("menu.newBoard")}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isMobile && (
        <aside style={{ width: 230, flexShrink: 0, background: T.bgSidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", padding: "16px 14px", gap: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: -0.3 }}>{t("app.brand")}</div>
          {companyLinks.length > 1 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 6, letterSpacing: 0.5 }}>{t("menu.company").toUpperCase()}</div>
              <select value={activeCompanyId || ""} onChange={e => { const v = e.target.value; setActiveCompanyId(v); setActiveWorkspaceId(null); setActiveProjectId(null); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); }}
                style={{ width: "100%", fontSize: 12, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer" }}>
                {companyLinks.map(c => <option key={c.company.id} value={c.company.id}>{c.company.name}</option>)}
              </select>
            </div>
          )}
          {featureFlags.workspaces && workspaces.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 6, letterSpacing: 0.5 }}>{t("menu.workspace").toUpperCase()}</div>
              <select value={activeWorkspaceId || ""} onChange={e => { const v = e.target.value; setActiveWorkspaceId(v); setActiveProjectId(null); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); }}
                style={{ width: "100%", fontSize: 12, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer" }}>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}
          {projects.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 6, letterSpacing: 0.5 }}>{t("menu.project").toUpperCase()}</div>
              <select value={activeProjectId || ""} onChange={e => { const v = e.target.value; setActiveProjectId(v); setActiveBoardId(null); setBoards([]); setColumns([]); setStates([]); setCards([]); }}
                style={{ width: "100%", fontSize: 12, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer" }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, marginBottom: 6, letterSpacing: 0.5 }}>{t("menu.board").toUpperCase()}</div>
            <select value={activeBoardId || ""} onChange={e => setActiveBoardId(e.target.value)}
              style={{ width: "100%", fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 10px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer" }}>
              {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 56, background: T.bgSidebar, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", boxShadow: T.shadowSm }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen(true)}
                style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.border}`, background: T.bgElevated, color: T.text, cursor: "pointer" }}>
                ≡
              </button>
            )}
            <div style={{ position: "relative" }}>
              <button
                ref={topMenuButtonRef}
                onClick={() => setTopMenuOpen(v => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTopMenuOpen(true);
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setTopMenuOpen(true);
                  }
                }}
                style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bgElevated, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-haspopup="menu"
                aria-expanded={topMenuOpen}
                aria-label={t("menu.menu")}
                data-testid="topbar-menu-button"
              >
                {currentUser ? <Avatar user={currentUser} size={28} /> : <span style={{ fontSize: 12, color: T.textSoft }}>⋯</span>}
              </button>
              {topMenuOpen && (
                <div
                  ref={topMenuListRef}
                  role="menu"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setTopMenuOpen(false);
                      topMenuButtonRef.current?.focus();
                      return;
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const next = (topMenuIndex + 1) % topMenuActions.length;
                      setTopMenuIndex(next);
                      topMenuItemRefs.current[next]?.focus();
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const next = (topMenuIndex - 1 + topMenuActions.length) % topMenuActions.length;
                      setTopMenuIndex(next);
                      topMenuItemRefs.current[next]?.focus();
                    }
                  }}
                  style={{ position: "absolute", left: 0, top: "110%", minWidth: 180, background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: T.shadowMd, padding: 8, zIndex: 500 }}
                  data-testid="topbar-menu"
                >
                  {topMenuActions.map((action, idx) => (
                    <button
                      key={action.id}
                      ref={el => { if (el) topMenuItemRefs.current[idx] = el; }}
                      role="menuitem"
                      tabIndex={idx === topMenuIndex ? 0 : -1}
                      onMouseEnter={() => setTopMenuHover(action.id)}
                      onMouseLeave={() => setTopMenuHover(null)}
                      onClick={() => { action.onClick(); setTopMenuOpen(false); }}
                      data-testid={`topbar-menu-item-${action.id}`}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: (topMenuHover === action.id || topMenuIndex === idx) ? T.bgElevated : "transparent",
                        color: T.text,
                        cursor: "pointer",
                        transition: "background-color .15s ease",
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{headerTitle}</div>
            {headerSubtitle && <div style={{ fontSize: 11, color: T.textMuted }}>{headerSubtitle}</div>}
          </div>
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 10, padding: "0 10px", height: 36 }}>
              <span style={{ fontSize: 12, color: T.textMuted }}>⌕</span>
              <input placeholder={t("menu.searchPlaceholder") || "Buscar..."} style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, color: T.text, width: 180 }} />
            </div>
          )}
          {featureFlags.improvements && (
            <button onClick={() => setPage("improvements")}
              style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 9, border: `1px solid ${T.accent}`, background: T.accentSoft, color: T.accent, cursor: "pointer" }}>
              {t("menu.improvements")}
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mainContent}
        </div>
      </div>
    </div>,
  );
}
