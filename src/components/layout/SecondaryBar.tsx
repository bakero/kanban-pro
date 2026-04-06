import { useTheme } from "../../hooks/useTheme";
import { useLang } from "../../i18n";

export type SecondaryAction = {
  id: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
};

interface SecondaryBarProps {
  actions: SecondaryAction[];
  order: string[];
  onEdit: () => void;
}

export function SecondaryBar({ actions, order, onEdit }: SecondaryBarProps) {
  const T = useTheme();
  const { t } = useLang();

  const actionMap = new Map(actions.map(action => [action.id, action]));
  const ordered = order.length
    ? order.map(id => actionMap.get(id)).filter(Boolean) as SecondaryAction[]
    : actions;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 16px",
      borderBottom: `1px solid ${T.border}`,
      background: T.bgSidebar,
      backdropFilter: "blur(14px)",
      flexWrap: "wrap",
    }}>
      {ordered.map(action => {
        const active = action.active;
        const disabled = action.disabled;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={disabled}
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 10,
              border: `1px solid ${active ? T.accent : T.border}`,
              backgroundColor: active ? T.accentSoft : "transparent",
              color: active ? T.accent : T.textSoft,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {action.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        onClick={onEdit}
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "6px 10px",
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          backgroundColor: "transparent",
          color: T.textSoft,
          cursor: "pointer",
        }}
      >
        {t("secondary.edit")}
      </button>
    </div>
  );
}
