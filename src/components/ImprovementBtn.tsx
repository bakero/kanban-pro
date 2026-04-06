import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { ImprovementModal } from "./ImprovementModal";

interface ImprovementBtnProps {
  companyId: string;
  boardId: string;
  userId: string;
  userName: string;
  context: string;
}

export function ImprovementBtn({ companyId, boardId, userId, userName, context }: ImprovementBtnProps) {
  const T = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="Proponer mejora"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "2px 4px", borderRadius: 6, lineHeight: 1,
          fontSize: 15, opacity: 0.7, color: T.iconBtn,
          transition: "opacity .15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; }}
      >
        💡
      </button>
      {open && (
        <ImprovementModal
          companyId={companyId}
          boardId={boardId}
          userId={userId}
          userName={userName}
          context={context}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
