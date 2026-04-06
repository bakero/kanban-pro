export const FONT = "'Plus Jakarta Sans', 'Inter Tight', sans-serif";

export const SUPER_ADMIN_EMAIL = "bkasero@gmail.com";

export const DOCS_URL = (import.meta.env.VITE_DOCS_URL as string | undefined) || "/docs";

export const ADMIN_DOCS_URL = (import.meta.env.VITE_ADMIN_DOCS_URL as string | undefined) || "/docs/admin";

export const PHASE_COLORS: Record<string, string> = {
  pre: "#8A94A6",
  work: "#3E7BFA",
  post: "#27A376",
};

export const TASK_TYPES = {
  tarea: { color: "#1D9E75", icon: "?" },
  epica: { color: "#7F77DD", icon: "?" },
  iniciativa: { color: "#2c2c2e", icon: "?" },
  bug: { color: "#E24B4A", icon: "?" },
};

export const PHASE_META = {
  pre: { labelKey: "board.legend.pre", color: "#888780" },
  work: { labelKey: "board.legend.work", color: "#378ADD" },
  post: { labelKey: "board.legend.post", color: "#1D9E75" },
} as const;

export const HIDE_DONE_VALUES = [0, 1, 3, 5, 7, 15, 21, 30];

export const DEFAULT_VISIBLE = [
  "tipo", "categoria", "estado", "dueDate", "creador", "bloqueado",
  "descripcion", "dependencias", "comentarios", "archivos", "tiempos", "historial",
];
