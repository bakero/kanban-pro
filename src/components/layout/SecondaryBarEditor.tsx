import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useLang } from "../../i18n";
import { Btn } from "../ui/Btn";

interface SecondaryBarEditorProps {
  isOpen: boolean;
  actions: { id: string; label: string }[];
  order: string[];
  onSave: (nextOrder: string[]) => void;
  onClose: () => void;
}

export function SecondaryBarEditor({ isOpen, actions, order, onSave, onClose }: SecondaryBarEditorProps) {
  const T = useTheme();
  const { t } = useLang();
  const initial = useMemo(() => {
    if (!order.length) return actions.map(a => a.id);
    const set = new Set(order);
    const missing = actions.map(a => a.id).filter(id => !set.has(id));
    return [...order, ...missing];
  }, [order, actions]);

  const [enabled, setEnabled] = useState(() => new Set(order.length ? order : actions.map(a => a.id)));
  const [localOrder, setLocalOrder] = useState(initial);

  useEffect(() => {
    if (!isOpen) return;
    setEnabled(new Set(order.length ? order : actions.map(a => a.id)));
    setLocalOrder(initial);
  }, [isOpen, order, actions, initial]);

  if (!isOpen) return null;

  function toggle(id: string) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function move(id: string, dir: -1 | 1) {
    setLocalOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function handleSave() {
    const nextOrder = localOrder.filter(id => enabled.has(id));
    onSave(nextOrder);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 800, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: T.bgSidebar, borderRadius: 18, border: `1px solid ${T.border}`, padding: 20, boxShadow: T.shadowLg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: T.text }}>{t("secondary.title")}</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: T.textSoft, cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {localOrder.map(id => {
            const action = actions.find(a => a.id === id);
            if (!action) return null;
            const isOn = enabled.has(id);
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: 12, padding: "8px 10px" }}>
                <input type="checkbox" checked={isOn} onChange={() => toggle(id)} />
                <span style={{ flex: 1, fontSize: 12, color: T.text }}>{action.label}</span>
                <button title={t("secondary.moveUp")} onClick={() => move(id, -1)} style={{ border: `1px solid ${T.border}`, background: T.bgElevated, borderRadius: 8, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>↑</button>
                <button title={t("secondary.moveDown")} onClick={() => move(id, 1)} style={{ border: `1px solid ${T.border}`, background: T.bgElevated, borderRadius: 8, padding: "2px 6px", cursor: "pointer", fontSize: 12 }}>↓</button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <Btn variant="primary" onClick={handleSave}>{t("secondary.save")}</Btn>
          <Btn variant="outline" onClick={onClose}>{t("secondary.cancel")}</Btn>
        </div>
      </div>
    </div>
  );
}

