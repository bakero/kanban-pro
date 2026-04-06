/**
 * Atomically patches App.tsx:
 * 1. Adds react-router-dom import
 * 2. Adds createCard import from db
 * 3. Inserts router hooks + URL sync effects after dragCardId ref
 * 4. Updates newCard to use createCard
 */
import { readFileSync, writeFileSync } from 'fs';

const path = 'src/App.tsx';
let c = readFileSync(path, 'utf8');

if (c.includes('useNavigate')) {
  console.log('Already patched.');
  process.exit(0);
}

// 1. Add router import after the ReactNode import line
c = c.replace(
  `import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";`,
  `import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";`
);

// 2. Add createCard to db imports
c = c.replace(
  `  setCompanyFeature,
} from "./lib/db";`,
  `  setCompanyFeature,
  createCard,
} from "./lib/db";`
);

// 3. Insert router hooks + effects after the dragCardId ref declaration
const AFTER_DRAG = `  const dragCardId = useRef<string | null>(null);`;
const ROUTER_BLOCK = `  const dragCardId = useRef<string | null>(null);

  // ── Router integration ──────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();
  const { boardNumericId, openCardId, workspaceNumericId } = useParams<{
    boardNumericId?: string;
    openCardId?: string;
    workspaceNumericId?: string;
  }>();

  // Apply navigation state passed by SmartRedirect
  useEffect(() => {
    const state = location.state as null | {
      companyId?: string;
      workspaceId?: string;
      projectId?: string;
    };
    if (!state) return;
    if (state.companyId) setActiveCompanyId(state.companyId);
    if (state.workspaceId) setActiveWorkspaceId(state.workspaceId);
    if (state.projectId) setActiveProjectId(state.projectId);
    navigate(location.pathname, { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open board from /board/:boardNumericId
  useEffect(() => {
    if (!boardNumericId || !boards.length) return;
    const numId = Number(boardNumericId);
    const target = boards.find(b => b.numeric_id === numId);
    if (target && target.id !== activeBoardId) setActiveBoardId(target.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardNumericId, boards]);

  // Open card modal from /board/:boardNumericId/card/:openCardId
  useEffect(() => {
    if (!openCardId || !cards.length || modal) return;
    const target = cards.find(c => c.id === openCardId);
    if (target) setModal(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCardId, cards]);

  // Switch workspace from /workspace/:workspaceNumericId
  useEffect(() => {
    if (!workspaceNumericId || !workspaces.length) return;
    const numId = Number(workspaceNumericId);
    const target = workspaces.find(w => w.numeric_id === numId);
    if (target && target.id !== activeWorkspaceId) setActiveWorkspaceId(target.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceNumericId, workspaces]);

  // Sync URL when active board changes
  useEffect(() => {
    if (!activeBoardId || !boards.length) return;
    const board = boards.find(b => b.id === activeBoardId);
    if (!board?.numeric_id) return;
    const target = \`/board/\${board.numeric_id}\`;
    if (location.pathname !== target) navigate(target, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoardId]);
  // ─────────────────────────────────────────────────────────────`;

c = c.replace(AFTER_DRAG, ROUTER_BLOCK);

// 4. Update newCard to use createCard
const OLD_NEW_CARD = `  async function newCard() {
    if (!board || !columns.length || !currentUser) return;
    const seq = board.card_seq;
    const updatedBoard = { ...board, card_seq: seq + 1 };
    setBoards(bs => bs.map(b => b.id === board.id ? updatedBoard : b));
    await saveBoard(updatedBoard, currentUser.id);
    const firstCol = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids || []).includes(s.id)) || states[0];
    const c: Card = {
      id: uid(),
      card_id: \`\${board.prefix}-\${String(seq).padStart(3, "0")}\`,
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
  }`;

const NEW_NEW_CARD = `  async function newCard() {
    if (!board || !columns.length || !currentUser) return;
    const firstCol = columns[0];
    const firstState = states.find(s => (firstCol?.state_ids || []).includes(s.id)) || states[0];
    const projectPrefix = activeProject?.prefix || board.prefix;
    const c: Card = {
      id: uid(),
      card_id: \`\${projectPrefix}-???\`,
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
    const saved = await createCard(c, projectPrefix, currentUser.id);
    if (saved.card_id !== c.card_id) {
      setCards(cs => cs.map(x => x.id === c.id ? saved : x));
      setModal(saved);
    }
  }`;

if (!c.includes(OLD_NEW_CARD)) {
  console.error('newCard pattern not found — skipping that patch');
} else {
  c = c.replace(OLD_NEW_CARD, NEW_NEW_CARD);
}

writeFileSync(path, c, 'utf8');
console.log('App.tsx patched successfully.');
