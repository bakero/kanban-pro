export const FONT = "'Inter', sans-serif";

export const SUPER_ADMIN_EMAIL = "bkasero@gmail.com";

export const DOCS_URL = (import.meta.env.VITE_DOCS_URL as string | undefined) || "/docs";

export const ADMIN_DOCS_URL = (import.meta.env.VITE_ADMIN_DOCS_URL as string | undefined) || "/docs/admin";

export const PHASE_COLORS: Record<string, string> = {
  pre: "#8A93A8",
  work: "#1A6EFF",
  post: "#00C48C",
};

export const TASK_TYPES = {
  tarea: { color: "#1D9E75", icon: "?" },
  epica: { color: "#7F77DD", icon: "?" },
  iniciativa: { color: "#2c2c2e", icon: "?" },
  bug: { color: "#E24B4A", icon: "?" },
};

export const PHASE_META = {
  pre: { labelKey: "board.legend.pre", color: "#8A93A8" },
  work: { labelKey: "board.legend.work", color: "#1A6EFF" },
  post: { labelKey: "board.legend.post", color: "#00C48C" },
} as const;

export const HIDE_DONE_VALUES = [0, 1, 3, 5, 7, 15, 21, 30];

export const DEFAULT_VISIBLE = [
  "tipo", "categoria", "estado", "dueDate", "creador", "bloqueado",
  "descripcion", "dependencias", "comentarios", "archivos", "tiempos", "historial",
];
