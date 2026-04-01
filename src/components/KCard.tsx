import { FONT, PHASE_COLORS } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { daysSince } from "../lib/utils";
import { Avatar } from "./ui/Avatar";
import { TypeIcon } from "./ui/TypeIcon";
import type { Card, BoardColumn, BoardState, User } from "../types";

interface KCardProps {
  card: Card;
  columns: BoardColumn[];
  states: BoardState[];
  users: User[];
  allCards: Card[];
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export function KCard({ card, columns, states, users, allCards, onOpen, onDragStart }: KCardProps) {
  const T = useTheme();
  const creator   = users.find(u => u.id === card.creator_id);
  const due       = card.due_date ? new Date(card.due_date) : null;
  const overdue   = due && due < new Date();
  const col       = columns.find(c => c.id === card.col_id);
  const colColor  = PHASE_COLORS[col?.phase || "pre"];
  const state     = states.find(s => s.id === card.state_id);
  const isDiscard = state?.name?.toLowerCase().includes("descart");
  const daysInCol = daysSince(card.col_since || Date.now());
  const deps      = (card.depends_on || []).map(id => allCards.find(c => c.id === id)).filter(Boolean) as Card[];
  const hasDeps   = deps.length > 0;
  const allResolved = hasDeps && deps.every(d => !!d.completed_at);

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(e, card.id); }}
      onClick={() => onOpen(card.id)}
      style={{
        backgroundColor: T.bgCard, borderRadius: 12,
        border: `1.5px solid ${T.border}`, borderLeft: `4px solid ${colColor}`,
        padding: "10px 12px", cursor: "pointer", userSelect: "none",
        marginBottom: 8, boxSizing: "border-box",
        transition: "transform .15s, box-shadow .15s",
        opacity: isDiscard ? 0.65 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 5px 16px rgba(0,0,0,0.12)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <TypeIcon type={card.type} size={15} />
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, fontFamily: FONT, flex: 1, textDecoration: isDiscard ? "line-through" : "none" }}>
          {card.card_id}
        </span>
        {card.blocked && (
          <span style={{ fontSize: 9, fontWeight: 700, color: "#c0392b", background: "#fdecea", borderRadius: 20, padding: "1px 5px", fontFamily: FONT }}>
            BLOQ.
          </span>
        )}
        {creator && <Avatar user={creator} size={20} />}
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 8px", lineHeight: 1.4, fontFamily: FONT, textDecoration: isDiscard ? "line-through" : "none" }}>
        {card.title}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: T.bgSoft, color: T.textSoft, fontFamily: FONT }}>
          {card.category}
        </span>
        <div style={{ flex: 1 }} />
        {hasDeps && (
          <span style={{ fontSize: 12, fontWeight: 700, color: allResolved ? "#1D9E75" : "#E24B4A" }} title={deps.map(d => d.title).join(", ")}>
            ⬆
          </span>
        )}
        {card.due_date && (
          <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, background: overdue ? "#E24B4A" : T.bgSoft, color: overdue ? "#fff" : T.textSoft, padding: "2px 6px", borderRadius: 8 }}>
            {card.due_date}
          </span>
        )}
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          backgroundColor: daysInCol > 7 ? "#E24B4A" : daysInCol > 3 ? "#BA7517" : "#7F77DD",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0,
        }} title={`${daysInCol} días en este estado`}>
          {daysInCol}
        </div>
      </div>
    </div>
  );
}
