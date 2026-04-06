import { FONT, PHASE_COLORS } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { daysSince } from "../lib/utils";
import { Avatar } from "./ui/Avatar";
import { TypeIcon } from "./ui/TypeIcon";
import type { BoardColumn, BoardState, Card, FeatureFlags, User } from "../types";

interface KCardProps {
  card: Card;
  columns: BoardColumn[];
  states: BoardState[];
  users: User[];
  allCards: Card[];
  featureFlags?: FeatureFlags;
  onOpen: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

export function KCard({ card, columns, states, users, allCards, featureFlags, onOpen, onDragStart }: KCardProps) {
  const T = useTheme();
  const creator = users.find(u => u.id === card.creator_id);
  const due = card.due_date ? new Date(card.due_date) : null;
  const overdue = due && due < new Date();
  const col = columns.find(c => c.id === card.col_id);
  const colColor = PHASE_COLORS[col?.phase || "pre"];
  const state = states.find(s => s.id === card.state_id);
  const isDiscard = state?.name?.toLowerCase().includes("descart");
  const daysInCol = daysSince(card.col_since || Date.now());
  const showDeps = featureFlags?.dependencies !== false;
  const deps = showDeps ? (card.depends_on || []).map(id => allCards.find(c => c.id === id)).filter(Boolean) as Card[] : [];
  const hasDeps = showDeps && deps.length > 0;
  const allResolved = hasDeps && deps.every(d => !!d.completed_at);
  const cardBg =
    col?.phase === "work" ? `${colColor}20`
      : col?.phase === "post" ? `${colColor}22`
        : T.bgCard;

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart(e, card.id); }}
      onClick={() => onOpen(card.id)}
      style={{
        backgroundColor: cardBg,
        borderRadius: 16,
        border: `1px solid ${col?.phase === "work" ? `${colColor}40` : T.border}`,
        padding: "12px 13px 12px 16px",
        cursor: "pointer",
        userSelect: "none",
        marginBottom: 10,
        boxSizing: "border-box",
        transition: "transform .15s, box-shadow .15s, border-color .15s",
        opacity: isDiscard ? 0.65 : 1,
        boxShadow: T.shadowSm,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = T.shadowMd;
        e.currentTarget.style.borderColor = `${colColor}55`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = col?.phase === "work" ? `${colColor}40` : T.border;
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderRadius: 999, background: colColor }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {featureFlags?.card_types !== false && <TypeIcon type={card.type} size={15} />}
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textSoft, fontFamily: FONT, flex: 1, textDecoration: isDiscard ? "line-through" : "none" }}>
          {card.card_id}
        </span>
        {card.blocked && (
          <span style={{ fontSize: 9, fontWeight: 700, color: T.danger, background: T.dangerSoft, borderRadius: 20, padding: "2px 7px", fontFamily: FONT }}>
            BLOQ.
          </span>
        )}
        {creator && <Avatar user={creator} size={20} />}
      </div>
      <p style={{ fontSize: 13, fontWeight: 700, color: T.text, margin: "0 0 8px", lineHeight: 1.4, fontFamily: FONT, textDecoration: isDiscard ? "line-through" : "none" }}>
        {card.title}
      </p>
      {card.description && (
        <p style={{ fontSize: 11, lineHeight: 1.45, color: T.textSoft, margin: "0 0 10px", fontFamily: FONT }}>
          {card.description.slice(0, 90)}{card.description.length > 90 ? "..." : ""}
        </p>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        {featureFlags?.categories !== false && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: T.bgElevated, color: T.textSoft, fontFamily: FONT, border: `1px solid ${T.border}` }}>
            {card.category}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {hasDeps && (
          <span style={{ fontSize: 12, fontWeight: 700, color: allResolved ? T.success : T.danger }} title={deps.map(d => d.title).join(", ")}>
            ↑
          </span>
        )}
        {card.due_date && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT, background: overdue ? T.danger : T.bgElevated, color: overdue ? "#fff" : T.textSoft, padding: "3px 8px", borderRadius: 10, border: overdue ? "none" : `1px solid ${T.border}` }}>
            {card.due_date}
          </span>
        )}
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: daysInCol > 7 ? T.danger : daysInCol > 3 ? T.warning : T.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
          }}
          title={`${daysInCol} días en este estado`}
        >
          {daysInCol}
        </div>
      </div>
    </div>
  );
}
