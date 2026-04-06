import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { FONT, PHASE_COLORS } from "./constants";
import { ThemeContext, ThemeModeContext, resolveTheme, usePrefersDark } from "./hooks/useTheme";
import type { ThemeMode } from "./hooks/useTheme";
import {
  acceptPendingInvites,
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
  resolveCompanyFeatureFlags,
  saveBoard,
  saveCard,
  saveColumn,
  saveState,
  seedBoardForProject,
  sendGoogleActivationEmail,
  createCompanyBackup,
  saveCompanySettings,
  setCompanyFeature,
} from "./lib/db";
import { supabase } from "./lib/supabase";
import { daysSince, formatDur, genPrefix, histEntry, uid } from "./lib/utils";
import { CardModal } from "./components/CardModal";
import { ImprovementBtn } from "./components/ImprovementBtn";
import { ImprovementsPage } from "./components/ImprovementsPage";
import { JustifyModal } from "./components/JustifyModal";
import { KCard } from "./components/KCard";
import { LoginPage } from "./components/LoginPage";
import { NewKanbanModal } from "./components/NewKanbanModal";
import { SettingsPage } from "./components/settings/SettingsPage";
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

type AppPage = "board" | "settings" | "improvements";

export default function App() {
  const prefersDark = usePrefersDark();

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

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
  const [showNewKanban, setShowNewKanban] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activationInfo, setActivationInfo] = useState<string | null>(null);
  const dragCardId = useRef<string | null>(null);

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
  }, [session?.user?.id]);

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
  }, [activeCompanyId, currentUser?.id]);

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
  }, [activeProjectId, currentUser?.id]);

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
  }, [activeBoardId, activeProjectId, currentUser?.id]);

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
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const myProjectRole = projectMembers.find(m => m.user_id === currentUser?.id)?.role || "member";
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

  const metricDefs = [
    { label: "Lead time medio", value: formatDur(avgLead), color: T.accent, hint: leadTimes.length ? `${leadTimes.length} completadas` : "Sin datos" },
    { label: "Cycle time medio", value: formatDur(avgCycle), color: T.warning, hint: wipCols.map(c => c.name).join(", ") || "Sin WIP" },
    { label: "Throughput", value: String(throughput), color: T.success, hint: "Últimos 7 días" },
  ];

  const filters = [
    { id: "mine", label: "Mis tareas", fn: (c: Card) => c.creator_id === currentUser?.id },
    { id: "recent", label: "Act. 24h", fn: (c: Card) => { const l = c.history[c.history.length - 1]; try { return l && (Date.now() - new Date(l.ts).getTime()) < 86400000; } catch { return false; } } },
    { id: "blocked", label: "Bloqueadas", fn: (c: Card) => c.blocked },
    { id: "overdue", label: "Entrega pasada", fn: (c: Card) => !!c.due_date && new Date(c.due_date) < new Date() },
  ];

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
    await saveCard(updated, currentUser.id);
  }

  async function newCard() {
    if (!board || !columns.length || !currentUser) return;
    const seq = board.card_seq;
    const updatedBoard = { ...board, card_seq: seq + 1 };
    setBoards(bs => bs.map(b => b.id === board.id ? updatedBoard : b));
    await saveBoard(updatedBoard, currentUser.id);
    const firstCol = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids || []).includes(s.id)) || states[0];
    const c: Card = {
      id: uid(),
      card_id: `${board.prefix}-${String(seq).padStart(3, "0")}`,
      board_id: board.id,
      col_id: firstCol?.id,
      state_id: firstState?.id,
      title: "Nueva tarjeta",
      type: "tarea",
      category: board.categories[0] || "General",
      due_date: "",
      blocked: false,
      creator_id: currentUser.id,
      description: "",
      attachments: [],
      comments: [],
      history: [histEntry("Tarjeta creada", currentUser)],
      depends_on: [],
      blocked_by: [],
      time_per_col: {},
      col_since: Date.now(),
      created_at: new Date().toISOString(),
      completed_at: null,
      discarded_at: null,
    };
    setCards(cs => [c, ...cs]);
    setModal(c);
    await saveCard(c, currentUser.id);
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
    if (reason) hist.push(histEntry(`Justificación: ${reason}`, currentUser));
    hist.push(histEntry(`Movida a "${columns.find(c => c.id === colId)?.name}" (${newState?.name})`, currentUser));
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
    const prefix = genPrefix(title);
    const id = uid();
    const nb = {
      id,
      company_id: company.id,
      project_id: activeProjectId,
      title,
      prefix,
      card_seq: 1,
      owner_user_id: currentUser.id,
      board_config: { public: false, requireLogin: true, hideDoneAfterDays: 0 },
      visible_fields: [],
      categories: mode === "copy" ? [...(board?.categories || [])] : ["Frontend", "Backend"],
      created_at: new Date().toISOString(),
      sort_order: boards.length,
    } as unknown as Board;
    const newCols: BoardColumn[] = mode === "copy"
      ? columns.map(c => ({ ...c, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: "Por hacer", phase: "pre", state_ids: [], wip_limit: 0, is_wip: false, sort_order: 0 },
          { id: uid(), board_id: id, name: "En progreso", phase: "work", state_ids: [], wip_limit: 3, is_wip: true, sort_order: 1 },
          { id: uid(), board_id: id, name: "Hecho", phase: "post", state_ids: [], wip_limit: 0, is_wip: false, sort_order: 2 },
        ];
    const newStates: BoardState[] = mode === "copy"
      ? states.map(s => ({ ...s, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: "Pendiente", phase: "pre", is_discard: false, sort_order: 0 },
          { id: uid(), board_id: id, name: "En curso", phase: "work", is_discard: false, sort_order: 1 },
          { id: uid(), board_id: id, name: "Completado", phase: "post", is_discard: false, sort_order: 2 },
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

  async function handleActivationEmail() {
    if (!currentUser?.email) return;
    await sendGoogleActivationEmail(currentUser.email);
    setActivationInfo(`Email de confirmación enviado a ${currentUser.email}`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
  }

  function withTheme(content: ReactNode) {
    return (
      <ThemeModeContext.Provider value={{ mode: themeMode, setMode: setThemeMode }}>
        <ThemeContext.Provider value={T}>
          {content}
        </ThemeContext.Provider>
      </ThemeModeContext.Provider>
    );
  }

  if (authLoading) {
    return withTheme(
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
        Preparando acceso...
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
          <p style={{ fontSize: 15, fontWeight: 600, color: T.textSoft, margin: 0 }}>Cargando Kanban Pro...</p>
        </div>
      </div>,
    );
  }

  if (!company) {
    return withTheme(
      <div style={{ minHeight: "100vh", background: T.bgSoft, padding: 24, fontFamily: FONT }}>
        <p style={{ color: T.text, fontWeight: 700 }}>No tienes una empresa asignada.</p>
        <p style={{ color: T.textSoft, fontSize: 13 }}>Contacta con el administrador para recibir acceso.</p>
      </div>,
    );
  }

  if (page === "improvements" && currentUser && company && featureFlags.improvements) {
    return withTheme(<ImprovementsPage currentUser={currentUser} companyId={company.id} onBack={() => setPage("board")} />);
  }

  if (page === "settings" && board && currentUser && company) {
    return withTheme(
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
      </div>,
    );
  }

  if (!board || !currentUser || !activeProject) {
    return withTheme(
      <div style={{ minHeight: "100vh", background: T.bgSoft, padding: 24, fontFamily: FONT }}>
        <p style={{ color: T.text, fontWeight: 700 }}>No hay tableros accesibles.</p>
        {!activeProject && (
          <p style={{ color: T.textSoft, fontSize: 13 }}>
            Pide al administrador que cree un proyecto para tu empresa.
          </p>
        )}
      </div>,
    );
  }

  return withTheme(
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh", position: "relative", color: T.text }}>
      {modal && (
        <CardModal
          card={modal}
          board={board}
          columns={columns}
          states={states}
          users={users}
          currentUser={currentUser}
          companyId={company.id}
          showImprovements={!!featureFlags.improvements}
          allCards={cards}
          categories={board.categories}
          onClose={() => setModal(null)}
          onSave={onSaveCard}
          onSaveCat={onSaveCat}
          onOpenCard={openCard}
        />
      )}
      {justifyPending && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900, padding: 20 }}>
          <JustifyModal
            title={justifyPending.isDiscard ? "Descartar tarea" : "Reabrir tarea"}
            onConfirm={r => applyDrop(justifyPending.cardId, justifyPending.colId, justifyPending.stateId, r)}
            onCancel={() => setJustifyPending(null)}
          />
        </div>
      )}
      {showNewKanban && <NewKanbanModal onClose={() => setShowNewKanban(false)} onCreate={createBoard} />}

      <div style={{ position: "sticky", top: 0, zIndex: 100, padding: "16px 20px 10px" }}>
        <div style={{ backgroundColor: T.bgSidebar, border: `1px solid ${T.border}`, backdropFilter: "blur(18px)", boxShadow: T.shadowMd, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderRadius: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: -0.5 }}>Kanban Pro</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, padding: "6px 10px", borderRadius: 999, background: T.accentSoft, border: `1px solid ${T.border}` }}>
            Soft workflow UI
          </span>
          {companyLinks.length > 1 && (
            <select
              value={activeCompanyId || ""}
              onChange={e => {
                const next = e.target.value;
                setActiveCompanyId(next);
                setActiveWorkspaceId(null);
                setActiveProjectId(null);
                setActiveBoardId(null);
                setBoards([]);
                setColumns([]);
                setStates([]);
                setCards([]);
              }}
              style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer", maxWidth: 180 }}
            >
              {companyLinks.map(c => <option key={c.company.id} value={c.company.id}>{c.company.name}</option>)}
            </select>
          )}
          {workspaces.length > 0 && (
            <select
              value={activeWorkspaceId || ""}
              onChange={e => {
                const next = e.target.value;
                setActiveWorkspaceId(next);
                setActiveProjectId(null);
                setActiveBoardId(null);
                setBoards([]);
                setColumns([]);
                setStates([]);
                setCards([]);
              }}
              style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer", maxWidth: 180 }}
            >
              {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          {projects.length > 0 && (
            <select
              value={activeProjectId || ""}
              onChange={e => {
                const next = e.target.value;
                setActiveProjectId(next);
                setActiveBoardId(null);
                setBoards([]);
                setColumns([]);
                setStates([]);
                setCards([]);
              }}
              style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer", maxWidth: 180 }}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <select
            value={activeBoardId || ""}
            onChange={e => setActiveBoardId(e.target.value)}
            style={{ fontSize: 13, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, outline: "none", cursor: "pointer", maxWidth: 220 }}
          >
            {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <button
            onClick={() => setShowNewKanban(true)}
            style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px dashed ${T.borderStrong}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}
          >
            + Nuevo tablero
          </button>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: T.textSoft }}>{currentUser.name}</span>
          {featureFlags.wip && wipCols.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: wipTotal > 0 ? T.warning : T.textSoft, background: T.bgElevated, borderRadius: 999, padding: "8px 12px", border: `1px solid ${T.border}` }}>
              WIP {wipTotal}/{wipCols.reduce((a, c) => a + (c.wip_limit || 0), 0) || "∞"}
            </span>
          )}
          {featureFlags.metrics && (
            <button onClick={() => setShowMetrics(v => !v)} style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px solid ${showMetrics ? T.accent : T.border}`, backgroundColor: showMetrics ? T.accentSoft : "transparent", color: showMetrics ? T.accent : T.textSoft, cursor: "pointer" }}>
              {showMetrics ? "▼ Métricas" : "▶ Métricas"}
            </button>
          )}
          {featureFlags.improvements && (
            <button onClick={() => setPage("improvements")} style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
              Mejoras
            </button>
          )}
          <button onClick={() => setPage("settings")} style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            Config.
          </button>
          <button onClick={handleActivationEmail} style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            Email activación
          </button>
          <button onClick={handleLogout} style={{ fontSize: 12, fontWeight: 700, padding: "10px 12px", borderRadius: 12, border: `1px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            Salir
          </button>
          <select
            value={themeMode}
            onChange={e => setThemeMode(e.target.value as ThemeMode)}
            style={{ fontSize: 12, fontWeight: 700, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", backgroundColor: T.bgElevated, color: T.text, cursor: "pointer" }}
          >
            <option value="system">Tema sistema</option>
            <option value="light">Modo claro</option>
            <option value="dark">Modo oscuro</option>
          </select>
          {featureFlags.improvements && (
            <ImprovementBtn companyId={company?.id || ""} boardId={activeBoardId || ""} userId={currentUser.id} userName={currentUser.name} context="board" />
          )}
          <button onClick={newCard} style={{ fontSize: 13, fontWeight: 800, padding: "11px 18px", borderRadius: 14, border: "none", backgroundColor: T.accent, color: "#fff", cursor: "pointer", boxShadow: T.shadowSm }}>
            + Nueva tarjeta
          </button>
        </div>
      </div>

      {activationInfo && (
        <div style={{ margin: "0 20px 12px", padding: "12px 14px", background: T.successSoft, border: `1px solid ${T.success}44`, color: T.success, fontSize: 12, borderRadius: 14 }}>
          {activationInfo}
        </div>
      )}

      {featureFlags.metrics && showMetrics && (
        <div style={{ padding: "0 20px 14px", display: "flex", gap: 12, overflowX: "auto" }}>
          {metricDefs.map(m => (
            <div key={m.label} style={{ backgroundColor: T.bgElevated, borderRadius: 18, border: `1px solid ${T.border}`, padding: "14px 16px", minWidth: 170, flexShrink: 0, boxShadow: T.shadowSm }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: T.textSoft }}>{m.label}</p>
              <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: m.color }}>{m.value}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft }}>{m.hint}</p>
            </div>
          ))}
        </div>
      )}

      {featureFlags.filters && (
        <div style={{ margin: "0 20px 16px", padding: "12px 14px", display: "flex", gap: 8, alignItems: "center", border: `1px solid ${T.border}`, borderRadius: 18, backgroundColor: T.bgSidebar, flexWrap: "wrap", backdropFilter: "blur(14px)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.text, padding: "5px 9px", borderRadius: 999, background: T.bgElevated, border: `1px solid ${T.border}` }}>Leyenda</span>
          {(["pre", "work", "post"] as const).map(phase => (
            <span key={phase} style={{ fontSize: 11, fontWeight: 700, color: PHASE_COLORS[phase], padding: "5px 10px", borderRadius: 999, background: T.bgElevated, border: `1px solid ${T.border}` }}>
              {phase === "pre" ? "Pre-trabajo" : phase === "work" ? "En-trabajo" : "Post-trabajo"}
            </span>
          ))}
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, marginLeft: 6 }}>Filtros:</span>
          {filters.map(f => {
            const on = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilters(fs => on ? fs.filter(x => x !== f.id) : [...fs, f.id])}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 999, border: `1px solid ${on ? T.accent : T.border}`, backgroundColor: on ? T.accentSoft : "transparent", color: on ? T.accent : T.textSoft, cursor: "pointer" }}
              >
                {f.label}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button onClick={() => setActiveFilters([])} style={{ fontSize: 11, fontWeight: 700, padding: "8px 10px", borderRadius: 999, border: "none", backgroundColor: "transparent", color: T.danger, cursor: "pointer" }}>
              x Limpiar
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, padding: "0 20px 24px", overflowX: "auto", alignItems: "flex-start", minHeight: "calc(100vh - 190px)" }}>
        {columns.map(col => {
          const colColor = PHASE_COLORS[col.phase] || "#888";
          const colCards = cards.filter(c => c.col_id === col.id && cardVisible(c));
          const wipOver = col.is_wip && col.wip_limit > 0 && colCards.length > col.wip_limit;
          return (
            <div
              key={col.id}
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, col.id)}
              style={{
                width: 292,
                minWidth: 292,
                flexShrink: 0,
                backgroundColor: T.bgColumn,
                borderRadius: 22,
                border: `1px solid ${wipOver ? T.danger : T.border}`,
                display: "flex",
                flexDirection: "column",
                maxHeight: "calc(100vh - 210px)",
                boxShadow: T.shadowSm,
              }}
            >
              <div style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: colColor, letterSpacing: 0.2 }}>{col.name.toUpperCase()}</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: wipOver ? T.danger : T.textSoft, background: T.bgElevated, borderRadius: 999, padding: "4px 10px", border: `1px solid ${T.border}` }}>
                    {colCards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                  </span>
                </div>
                <div style={{ marginTop: 10, height: 4, borderRadius: 999, background: `${colColor}26`, overflow: "hidden" }}>
                  <div style={{ width: "38%", height: "100%", borderRadius: 999, background: colColor }} />
                </div>
                {col.is_wip && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: wipOver ? T.danger : T.warning, background: wipOver ? T.dangerSoft : T.warningSoft, borderRadius: 999, padding: "3px 8px", marginTop: 10, display: "inline-block" }}>
                    WIP{wipOver ? " - LIMITE SUPERADO" : ""}
                  </span>
                )}
              </div>
              <div style={{ padding: "12px", overflowY: "auto", flex: 1 }}>
                {colCards.length === 0 && (
                  <div style={{ textAlign: "center", padding: "28px 0", color: T.textSoft, fontSize: 12, fontStyle: "italic", border: `1px dashed ${T.borderStrong}`, borderRadius: 16, background: T.bgElevated }}>
                    Sin tarjetas
                  </div>
                )}
                {colCards.map(card => (
                  <KCard key={card.id} card={card} columns={columns} states={states} users={users} allCards={cards} onOpen={openCard} onDragStart={onDragStart} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>,
  );
}
