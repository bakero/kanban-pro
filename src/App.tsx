import { useState, useRef, useEffect } from "react";
import { ThemeContext, useSystemTheme } from "./hooks/useTheme";
import { FONT, PHASE_COLORS } from "./constants";
import { seedIfEmpty, loadAll, saveBoard, saveColumn, saveState, saveCard } from "./lib/db";
import { supabase } from "./lib/supabase";
import { uid, formatDur, histEntry, genPrefix, daysSince } from "./lib/utils";
import { KCard } from "./components/KCard";
import { CardModal } from "./components/CardModal";
import { JustifyModal } from "./components/JustifyModal";
import { NewKanbanModal } from "./components/NewKanbanModal";
import { SettingsPage } from "./components/settings/SettingsPage";
import { ImprovementsPage } from "./components/ImprovementsPage";
import { ImprovementBtn } from "./components/ImprovementBtn";
import type { Board, BoardColumn, BoardState, Card, User } from "./types";

export default function App() {
  const T = useSystemTheme();

  const [boards,  setBoards]  = useState<Board[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [states,  setStates]  = useState<BoardState[]>([]);
  const [users,   setUsers]   = useState<User[]>([]);
  const [cards,   setCards]   = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoardId, setActiveBoardId] = useState("b1");
  const [page,          setPage]          = useState<"board" | "settings" | "improvements">("board");
  const [modal,         setModal]         = useState<Card | null>(null);
  const [justifyPending, setJustifyPending] = useState<{ cardId: string; colId: string; stateId: string; isDiscard?: boolean } | null>(null);
  const [showMetrics,    setShowMetrics]    = useState(true);
  const [showNewKanban,  setShowNewKanban]  = useState(false);
  const [activeFilters,  setActiveFilters]  = useState<string[]>([]);
  const dragCardId = useRef<string | null>(null);

  // ── Initial load ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const data = await loadAll("b1");
      setUsers(data.users); setBoards(data.boards);
      setStates(data.states); setColumns(data.columns); setCards(data.cards);
      setLoading(false);
    })();
  }, []);

  // ── Realtime ────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("cards-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${activeBoardId}` }, payload => {
        if (payload.eventType === "INSERT") setCards(cs => [...cs, payload.new as Card]);
        if (payload.eventType === "UPDATE") setCards(cs => cs.map(c => c.id === (payload.new as Card).id ? payload.new as Card : c));
        if (payload.eventType === "DELETE") setCards(cs => cs.filter(c => c.id !== (payload.old as Card).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeBoardId]);

  const board = boards.find(b => b.id === activeBoardId) || boards[0];

  // ── Metrics ─────────────────────────────────────────────
  const discardStateIds = new Set(states.filter(s => s.name.toLowerCase().includes("descart")).map(s => s.id));
  const wipCols         = columns.filter(c => c.is_wip);
  const doneColIds      = columns.filter(c => c.phase === "post").map(c => c.id);
  const activeCards     = cards.filter(c => !discardStateIds.has(c.state_id));
  const completedCards  = activeCards.filter(c => c.completed_at && doneColIds.includes(c.col_id));
  const leadTimes       = completedCards.map(c => new Date(c.completed_at!).getTime() - new Date(c.created_at).getTime()).filter(v => v > 0);
  const avgLead         = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0;
  const cycleTimes      = activeCards.map(c => {
    const tpc = { ...c.time_per_col };
    if (wipCols.some(w => w.id === c.col_id)) tpc[c.col_id] = (tpc[c.col_id] || 0) + (Date.now() - (c.col_since || Date.now()));
    return wipCols.reduce((a, w) => a + (tpc[w.id] || 0), 0);
  }).filter(v => v > 0);
  const avgCycle    = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
  const throughput  = completedCards.filter(c => new Date(c.completed_at!).getTime() >= Date.now() - 7 * 24 * 3600000).length;
  const wipTotal    = cards.filter(c => wipCols.some(w => w.id === c.col_id) && !discardStateIds.has(c.state_id)).length;

  const metricDefs = [
    { label: "Lead time medio",  sub: "Creación → Hecho",     value: formatDur(avgLead),  color: "#7F77DD", hint: leadTimes.length ? `${leadTimes.length} completadas` : "Sin datos" },
    { label: "Cycle time medio", sub: "Tiempo en WIP",        value: formatDur(avgCycle), color: "#BA7517", hint: wipCols.map(c => c.name).join(", ") || "Sin WIP" },
    { label: "Throughput",       sub: "Completadas / semana", value: String(throughput),  color: "#1D9E75", hint: "Últimos 7 días" },
  ];

  // ── Filters ─────────────────────────────────────────────
  const FILTERS = [
    { id: "mine",    label: "Mis tareas",     fn: (c: Card) => c.creator_id === users[0]?.id },
    { id: "recent",  label: "Act. 24h",       fn: (c: Card) => { const l = c.history[c.history.length - 1]; try { return l && (Date.now() - new Date(l.ts).getTime()) < 86400000; } catch { return false; } } },
    { id: "blocked", label: "Bloqueadas",     fn: (c: Card) => c.blocked },
    { id: "overdue", label: "Entrega pasada", fn: (c: Card) => !!c.due_date && new Date(c.due_date) < new Date() },
  ];

  function cardVisible(c: Card) {
    const hide = board?.board_config?.hideDoneAfterDays || 0;
    if (hide > 0 && c.completed_at && daysSince(new Date(c.completed_at).getTime()) >= hide) return false;
    if (!activeFilters.length) return true;
    return activeFilters.every(fid => { const f = FILTERS.find(x => x.id === fid); return f ? f.fn(c) : true; });
  }

  // ── Card ops ─────────────────────────────────────────────
  function openCard(id: string) { setModal(cards.find(c => c.id === id) || null); }

  async function onSaveCard(updated: Card) {
    const prev = cards.find(c => c.id === updated.id);
    if (prev && prev.col_id !== updated.col_id) {
      const elapsed = Date.now() - (prev.col_since || Date.now());
      const tpc = { ...prev.time_per_col }; tpc[prev.col_id] = (tpc[prev.col_id] || 0) + elapsed;
      updated = { ...updated, time_per_col: tpc, col_since: Date.now() };
    }
    setCards(cs => cs.map(c => c.id === updated.id ? updated : c));
    setModal(null);
    await saveCard(updated);
  }

  async function newCard() {
    if (!board || !columns.length) return;
    const seq = board.card_seq;
    const updatedBoard = { ...board, card_seq: seq + 1 };
    setBoards(bs => bs.map(b => b.id === board.id ? updatedBoard : b));
    await saveBoard(updatedBoard);
    const firstCol   = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids || []).includes(s.id)) || states[0];
    const c: Card = {
      id: uid(), card_id: `${board.prefix}-${String(seq).padStart(3, "0")}`,
      board_id: board.id, col_id: firstCol?.id, state_id: firstState?.id,
      title: "Nueva tarjeta", type: "tarea", category: board.categories[0] || "Frontend",
      due_date: "", blocked: false, creator_id: users[0]?.id,
      description: "", attachments: [], comments: [],
      history: [histEntry("Tarjeta creada", users[0])],
      depends_on: [], blocked_by: [], time_per_col: {},
      col_since: Date.now(), created_at: new Date().toISOString(),
      completed_at: null, discarded_at: null,
    };
    setCards(cs => [c, ...cs]);
    setModal(c);
    await saveCard(c);
  }

  function onDragStart(e: React.DragEvent, id: string) { dragCardId.current = id; e.dataTransfer.effectAllowed = "move"; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault(); e.stopPropagation();
    const id = dragCardId.current; dragCardId.current = null;
    if (!id) return;
    const card = cards.find(c => c.id === id); if (!card) return;
    const col  = columns.find(c => c.id === colId); if (!col) return;
    const colCards   = cards.filter(c => c.col_id === colId);
    if (col.wip_limit > 0 && colCards.length >= col.wip_limit && card.col_id !== colId) return;
    const newStateId = (col.state_ids || [])[0] || states[0]?.id;
    const newState   = states.find(s => s.id === newStateId);
    const prevState  = states.find(s => s.id === card.state_id);
    const needsJustify  = (prevState?.phase === "post" || prevState?.is_discard) && newState?.phase !== "post" && !newState?.is_discard;
    const movingDiscard = !!newState?.is_discard && !prevState?.is_discard;
    if (needsJustify || movingDiscard) { setJustifyPending({ cardId: id, colId, stateId: newStateId, isDiscard: movingDiscard }); return; }
    await applyDrop(id, colId, newStateId, null);
  }

  async function applyDrop(cardId: string, colId: string, stateId: string, reason: string | null) {
    const card = cards.find(c => c.id === cardId); if (!card) return;
    const newState = states.find(s => s.id === stateId);
    const elapsed  = Date.now() - (card.col_since || Date.now());
    const tpc = { ...card.time_per_col }; tpc[card.col_id] = (tpc[card.col_id] || 0) + elapsed;
    const hist = [...card.history];
    if (reason) hist.push(histEntry(`Justificación: ${reason}`, users[0]));
    hist.push(histEntry(`Movida a "${columns.find(c => c.id === colId)?.name}" (${newState?.name})`, users[0]));
    const isDone    = newState?.phase === "post" && !newState?.is_discard;
    const isDiscard = !!newState?.is_discard;
    const updated: Card = {
      ...card, col_id: colId, state_id: stateId, time_per_col: tpc, col_since: Date.now(), history: hist,
      completed_at: isDone && !card.completed_at ? new Date().toISOString() : (!isDone && !isDiscard ? null : card.completed_at),
      discarded_at: isDiscard ? new Date().toISOString() : null,
    };
    setCards(cs => cs.map(c => c.id === cardId ? updated : c));
    setJustifyPending(null);
    await saveCard(updated);
  }

  async function createBoard(title: string, mode: string) {
    const prefix = genPrefix(title); const id = uid();
    const nb: Board = { id, title, prefix, card_seq: 1, board_config: { public: false, requireLogin: true, hideDoneAfterDays: 0 }, visible_fields: [], categories: mode === "copy" ? [...(board?.categories || [])] : ["Frontend", "Backend"] };
    const newCols: BoardColumn[] = mode === "copy"
      ? columns.map(c => ({ ...c, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: "Por hacer",   phase: "pre",  state_ids: [], wip_limit: 0, is_wip: false, sort_order: 0 },
          { id: uid(), board_id: id, name: "En progreso", phase: "work", state_ids: [], wip_limit: 3, is_wip: true,  sort_order: 1 },
          { id: uid(), board_id: id, name: "Hecho",       phase: "post", state_ids: [], wip_limit: 0, is_wip: false, sort_order: 2 },
        ];
    const newStates: BoardState[] = mode === "copy"
      ? states.map(s => ({ ...s, id: uid(), board_id: id }))
      : [
          { id: uid(), board_id: id, name: "Pendiente",  phase: "pre",  is_discard: false, sort_order: 0 },
          { id: uid(), board_id: id, name: "En curso",   phase: "work", is_discard: false, sort_order: 1 },
          { id: uid(), board_id: id, name: "Completado", phase: "post", is_discard: false, sort_order: 2 },
        ];
    await saveBoard(nb);
    await Promise.all(newCols.map(saveColumn));
    await Promise.all(newStates.map(saveState));
    setBoards(bs => [...bs, nb]); setColumns(cs => [...cs, ...newCols]); setStates(ss => [...ss, ...newStates]);
    setActiveBoardId(id); setShowNewKanban(false);
  }

  async function onSaveCat(cat: string) {
    if (!board || board.categories.includes(cat)) return;
    const updated = { ...board, categories: [...board.categories, cat] };
    setBoards(bs => bs.map(b => b.id === board.id ? updated : b));
    await saveBoard(updated);
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <ThemeContext.Provider value={T}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16, color: "#7F77DD" }}>⬡</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.textSoft, fontFamily: FONT, margin: 0 }}>Cargando Kanban Pro…</p>
        </div>
      </div>
    </ThemeContext.Provider>
  );

  // ── Improvements page ───────────────────────────────────
  if (page === "improvements") return (
    <ThemeContext.Provider value={T}>
      <ImprovementsPage
        boardId={activeBoardId}
        currentUser={users[0]}
        onBack={() => setPage("board")}
      />
    </ThemeContext.Provider>
  );

  // ── Settings page ────────────────────────────────────────
  if (page === "settings" && board) return (
    <ThemeContext.Provider value={T}>
      <SettingsPage
        board={board} columns={columns} states={states} users={users}
        onBack={() => setPage("board")}
        onUpdateBoard={b => { setBoards(bs => bs.map(x => x.id === b.id ? b : x)); saveBoard(b); }}
        onUpdateColumns={cols => setColumns(cols)}
        onUpdateStates={sts => setStates(sts)}
        onUpdateUsers={us => setUsers(us)}
      />
    </ThemeContext.Provider>
  );

  // ── Board page ───────────────────────────────────────────
  return (
    <ThemeContext.Provider value={T}>
      <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh", position: "relative" }}>

        {/* Modals */}
        {modal && board && (
          <CardModal card={modal} board={board} columns={columns} states={states}
            users={users} allCards={cards} categories={board.categories}
            onClose={() => setModal(null)} onSave={onSaveCard}
            onSaveCat={onSaveCat} onOpenCard={openCard} />
        )}
        {justifyPending && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900, padding: 20 }}>
            <JustifyModal
              title={justifyPending.isDiscard ? "Descartar tarea" : "Reabrir tarea"}
              onConfirm={r => applyDrop(justifyPending.cardId, justifyPending.colId, justifyPending.stateId, r)}
              onCancel={() => setJustifyPending(null)} />
          </div>
        )}
        {showNewKanban && <NewKanbanModal onClose={() => setShowNewKanban(false)} onCreate={createBoard} />}

        {/* Header */}
        <div style={{ backgroundColor: T.bg, borderBottom: `1.5px solid ${T.border}`, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52, position: "sticky", top: 0, zIndex: 100 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#7F77DD", fontFamily: FONT, letterSpacing: -0.5 }}>⬡ Kanban Pro</span>
          <div style={{ width: 1, height: 24, background: T.border, flexShrink: 0 }} />
          <select value={activeBoardId} onChange={e => setActiveBoardId(e.target.value)}
            style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "5px 10px", backgroundColor: T.bgSoft, color: T.text, outline: "none", cursor: "pointer", maxWidth: 200 }}>
            {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
          <button onClick={() => setShowNewKanban(true)}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9, border: `1.5px dashed ${T.borderMed}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            + Nuevo tablero
          </button>
          <div style={{ flex: 1 }} />
          {wipCols.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: wipTotal > 0 ? "#BA7517" : T.textSoft, fontFamily: FONT, background: T.bgSoft, borderRadius: 20, padding: "4px 10px", border: `1.5px solid ${T.border}` }}>
              WIP {wipTotal}/{wipCols.reduce((a, c) => a + (c.wip_limit || 0), 0) || "∞"}
            </span>
          )}
          <button onClick={() => setShowMetrics(v => !v)}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9, border: `1.5px solid ${showMetrics ? "#7F77DD" : T.border}`, backgroundColor: showMetrics ? "#7F77DD18" : "transparent", color: showMetrics ? "#7F77DD" : T.textSoft, cursor: "pointer" }}>
            {showMetrics ? "▼ Métricas" : "▶ Métricas"}
          </button>
          <button onClick={() => setPage("improvements")}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9, border: `1.5px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            💡 Mejoras
          </button>
          <button onClick={() => setPage("settings")}
            style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9, border: `1.5px solid ${T.border}`, backgroundColor: "transparent", color: T.textSoft, cursor: "pointer" }}>
            ⚙ Config.
          </button>
          <ImprovementBtn
            boardId={activeBoardId}
            userId={users[0]?.id || ""}
            userName={users[0]?.name || ""}
            context="board"
          />
          <button onClick={newCard}
            style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: "6px 16px", borderRadius: 9, border: "none", backgroundColor: "#7F77DD", color: "#fff", cursor: "pointer" }}>
            + Nueva tarjeta
          </button>
        </div>

        {/* Metrics bar */}
        {showMetrics && (
          <div style={{ backgroundColor: T.bg, borderBottom: `1.5px solid ${T.border}`, padding: "10px 20px", display: "flex", gap: 12, overflowX: "auto" }}>
            {metricDefs.map(m => (
              <div key={m.label} style={{ backgroundColor: T.bgSoft, borderRadius: 12, border: `1.5px solid ${T.border}`, padding: "10px 16px", minWidth: 140, flexShrink: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT }}>{m.label}</p>
                <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: m.color, fontFamily: FONT }}>{m.value}</p>
                <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontFamily: FONT }}>{m.hint}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ padding: "8px 20px", display: "flex", gap: 6, alignItems: "center", borderBottom: `1px solid ${T.border}`, backgroundColor: T.bg }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.textSoft, fontFamily: FONT, marginRight: 4 }}>Filtros:</span>
          {FILTERS.map(f => {
            const on = activeFilters.includes(f.id);
            return (
              <button key={f.id} onClick={() => setActiveFilters(fs => on ? fs.filter(x => x !== f.id) : [...fs, f.id])}
                style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${on ? "#7F77DD" : T.border}`, backgroundColor: on ? "#7F77DD18" : "transparent", color: on ? "#7F77DD" : T.textSoft, cursor: "pointer" }}>
                {f.label}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button onClick={() => setActiveFilters([])}
              style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "none", backgroundColor: "transparent", color: "#E24B4A", cursor: "pointer" }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Columns */}
        <div style={{ display: "flex", gap: 14, padding: "16px 20px", overflowX: "auto", alignItems: "flex-start", minHeight: "calc(100vh - 160px)" }}>
          {columns.map(col => {
            const colColor = PHASE_COLORS[col.phase] || "#888";
            const colCards = cards.filter(c => c.col_id === col.id && cardVisible(c));
            const wipOver  = col.is_wip && col.wip_limit > 0 && colCards.length > col.wip_limit;
            return (
              <div key={col.id} onDragOver={onDragOver} onDrop={e => onDrop(e, col.id)} style={{
                width: 270, minWidth: 270, flexShrink: 0, backgroundColor: T.bg,
                borderRadius: 16, border: `1.5px solid ${wipOver ? "#E24B4A" : T.border}`,
                borderTop: `3px solid ${colColor}`, display: "flex", flexDirection: "column",
                maxHeight: "calc(100vh - 180px)",
              }}>
                <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: colColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: FONT, flex: 1 }}>{col.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: wipOver ? "#E24B4A" : T.textSoft, fontFamily: FONT, background: T.bgSoft, borderRadius: 20, padding: "1px 8px", border: `1px solid ${T.border}` }}>
                      {colCards.length}{col.wip_limit > 0 ? `/${col.wip_limit}` : ""}
                    </span>
                  </div>
                  {col.is_wip && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: wipOver ? "#E24B4A" : "#BA7517", fontFamily: FONT, background: wipOver ? "#FCEBEB" : "#FEF3CD", borderRadius: 20, padding: "1px 7px", marginTop: 4, display: "inline-block" }}>
                      WIP{wipOver ? " — LÍMITE SUPERADO" : ""}
                    </span>
                  )}
                </div>
                <div style={{ padding: "10px 10px", overflowY: "auto", flex: 1 }}>
                  {colCards.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: T.textSoft, fontSize: 12, fontFamily: FONT, fontStyle: "italic", border: `2px dashed ${T.border}`, borderRadius: 10 }}>
                      Sin tarjetas
                    </div>
                  )}
                  {colCards.map(card => (
                    <KCard key={card.id} card={card} columns={columns} states={states}
                      users={users} allCards={cards} onOpen={openCard} onDragStart={onDragStart} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
