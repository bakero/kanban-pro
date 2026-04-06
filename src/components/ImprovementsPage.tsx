import { useState, useEffect } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import {
  addImprovementVote,
  loadImprovements,
  removeImprovementVote,
} from "../lib/db";
import { Btn } from "./ui/Btn";
import type { Improvement, User } from "../types";

interface ImprovementsPageProps {
  currentUser: User;
  companyId: string;
  onBack: () => void;
}

export function ImprovementsPage({ currentUser, companyId, onBack }: ImprovementsPageProps) {
  const T = useTheme();
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [view, setView] = useState<"pending" | "history">("pending");
  const [sortBy, setSortBy] = useState<"votes" | "recent">("votes");
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadImprovements(companyId, currentUser.id).then(imps => {
      if (cancelled) return;
      setImprovements(imps);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, companyId]);

  const pending = improvements
    .filter(i => i.status === "pending" || i.status === "ai_pending")
    .sort((a, b) => {
      if (sortBy === "votes") {
        const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
        if (voteDiff !== 0) return voteDiff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const applied = [...improvements]
    .filter(i => i.status === "applied")
    .sort((a, b) => new Date(b.applied_at || b.created_at).getTime() - new Date(a.applied_at || a.created_at).getTime());

  async function toggleVote(imp: Improvement) {
    setVotingId(imp.id);
    if (imp.current_user_voted) {
      await removeImprovementVote(imp.id, currentUser.id);
      setImprovements(prev => prev.map(item =>
        item.id === imp.id
          ? { ...item, current_user_voted: false, vote_count: Math.max(0, (item.vote_count || 0) - 1) }
          : item
      ));
    } else {
      await addImprovementVote(imp.id, currentUser.id);
      setImprovements(prev => prev.map(item =>
        item.id === imp.id
          ? { ...item, current_user_voted: true, vote_count: (item.vote_count || 0) + 1 }
          : item
      ));
    }
    setVotingId(null);
  }

  function statusBadge(status: Improvement["status"]) {
    if (status === "ai_pending") {
      return (
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: T.warningSoft, color: T.warning, fontFamily: FONT }}>
          APROBADA PARA IA
        </span>
      );
    }

    return (
      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: T.bgSoft, color: T.textSoft, fontFamily: FONT }}>
        PENDIENTE
      </span>
    );
  }

  return (
    <div style={{ fontFamily: FONT, backgroundColor: T.bgSoft, minHeight: "100vh" }}>
      <div style={{ backgroundColor: T.bgSidebar, borderBottom: `1px solid ${T.border}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14, backdropFilter: "blur(18px)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: T.textSoft, padding: 0 }}>
          ← Volver
        </button>
        <span style={{ color: T.border }}>|</span>
        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: T.text }}>Mejoras compartidas</span>
        <div style={{ flex: 1 }} />
        <Btn variant={sortBy === "votes" ? "filterOn" : "filter"} onClick={() => setSortBy("votes")} style={{ fontSize: 12, padding: "5px 13px" }}>
          Mas votadas
        </Btn>
        <Btn variant={sortBy === "recent" ? "filterOn" : "filter"} onClick={() => setSortBy("recent")} style={{ fontSize: 12, padding: "5px 13px" }}>
          Mas recientes
        </Btn>
        <button
          onClick={() => setView(v => v === "pending" ? "history" : "pending")}
          style={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 13px",
            borderRadius: 9,
            border: `1.5px solid ${T.border}`,
            backgroundColor: "transparent",
            color: T.textSoft,
            cursor: "pointer",
          }}
        >
          {view === "pending" ? "Ver historial" : "Ver pendientes"}
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 20px" }}>
        {loading ? (
          <p style={{ color: T.textSoft, fontFamily: FONT, textAlign: "center", padding: 40 }}>Cargando...</p>
        ) : view === "pending" ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT }}>
                Pendientes ({pending.length})
              </span>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: T.textSoft, fontFamily: FONT }}>
                Cualquier usuario puede proponer mejoras y votar. La aprobacion para implementacion se realiza desde la consola central.
              </p>
            </div>

            {pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textSoft, fontFamily: FONT, fontSize: 13 }}>
                No hay mejoras pendientes
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {pending.map(imp => (
                  <div
                    key={imp.id}
                    style={{
                      border: `1.5px solid ${T.border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      backgroundColor: T.bgCard || T.bg,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 5px", fontSize: 13, color: T.text, fontFamily: FONT }}>
                        {imp.description}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {statusBadge(imp.status)}
                        <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>{imp.user_name}</span>
                        <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                          {new Date(imp.created_at).toLocaleString("es-ES")}
                        </span>
                        {imp.board_title && (
                          <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT, background: T.bgSoft, borderRadius: 20, padding: "1px 7px" }}>
                            {imp.board_title}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT, background: T.bgSoft, borderRadius: 20, padding: "1px 7px" }}>
                          {imp.context}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => void toggleVote(imp)}
                        disabled={votingId === imp.id}
                        style={{
                      border: `1px solid ${imp.current_user_voted ? T.success : T.border}`,
                      background: imp.current_user_voted ? T.successSoft : "transparent",
                      color: imp.current_user_voted ? T.success : T.textSoft,
                          borderRadius: 999,
                          padding: "6px 10px",
                          cursor: "pointer",
                          fontFamily: FONT,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        👍 {imp.vote_count || 0}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT }}>
                Historial compartido de mejoras aplicadas ({applied.length})
              </span>
            </div>

            {applied.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.textSoft, fontFamily: FONT, fontSize: 13 }}>
                Aun no se han aplicado mejoras
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {applied.map(imp => (
                  <div key={imp.id} style={{
                    backgroundColor: T.bgCard || T.bg,
                    border: `1.5px solid ${T.border}`,
                    borderLeft: `4px solid ${T.success}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}>
                    <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600, color: T.text, fontFamily: FONT }}>
                      {imp.description}
                    </p>
                    {imp.ai_result && (
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: T.success, fontFamily: FONT, background: T.successSoft, borderRadius: 8, padding: "6px 10px" }}>
                        {imp.ai_result}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: T.successSoft, color: T.success, fontFamily: FONT }}>
                        APLICADA
                      </span>
                      <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>{imp.user_name}</span>
                      <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                        Propuesta: {new Date(imp.created_at).toLocaleString("es-ES")}
                      </span>
                      {imp.applied_at && (
                        <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                          Aplicada: {new Date(imp.applied_at).toLocaleString("es-ES")}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: T.textSoft, fontFamily: FONT }}>
                        👍 {imp.vote_count || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
