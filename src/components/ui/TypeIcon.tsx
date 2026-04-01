import { TASK_TYPES } from "../../constants";

export function TypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = TASK_TYPES[type as keyof typeof TASK_TYPES] || TASK_TYPES.tarea;
  return (
    <span style={{
      width: size, height: size, borderRadius: 4,
      background: t.color + "22", border: `1.5px solid ${t.color}55`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.6, color: t.color, flexShrink: 0, fontWeight: 700,
    }}>
      {t.icon}
    </span>
  );
}
