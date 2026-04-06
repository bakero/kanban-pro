import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "../../types";
import { useTheme } from "../../hooks/useTheme";
import { Avatar } from "./Avatar";
import { buildUserSearchText, getUserFullName, normalizeText } from "../../lib/utils";
import { useLang } from "../../i18n";

interface UserPickerProps {
  users: User[];
  valueId?: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function UserPicker({ users, valueId, onChange, placeholder, disabled }: UserPickerProps) {
  const T = useTheme();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = users.find(u => u.id === valueId) || null;

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = normalizeText(query.trim());
    return users.filter(u => buildUserSearchText(u).includes(q));
  }, [users, query]);

  useEffect(() => {
    function handleClick(ev: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.bgElevated,
          color: T.text,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {selected ? (
          <>
            <Avatar user={selected} size={24} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span>{getUserFullName(selected) || selected.name}</span>
              <span style={{ fontSize: 10, color: T.textSoft }}>{selected.email}</span>
            </div>
          </>
        ) : (
          <span style={{ color: T.textSoft }}>{placeholder || t("userPicker.searchPlaceholder")}</span>
        )}
        <span style={{ marginLeft: "auto", color: T.textSoft }}>▼</span>
      </button>

      {open && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 200,
            background: T.bgSidebar,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: T.shadowMd,
            padding: 10,
          }}
        >
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t("userPicker.searchPlaceholder")}
            style={{
              width: "100%",
              fontSize: 12,
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              padding: "8px 10px",
              marginBottom: 8,
              background: T.bgElevated,
              color: T.text,
              outline: "none",
            }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.length === 0 && (
              <div style={{ padding: "8px 10px", fontSize: 12, color: T.textSoft }}>
                {t("userPicker.noResults")}
              </div>
            )}
            {filtered.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${valueId === user.id ? T.accent : T.border}`,
                  background: valueId === user.id ? T.accentSoft : "transparent",
                  color: T.text,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Avatar user={user} size={24} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{getUserFullName(user) || user.name}</span>
                  <span style={{ fontSize: 10, color: T.textSoft }}>{user.email}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
