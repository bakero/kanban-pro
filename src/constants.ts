export const FONT = "'Plus Jakarta Sans', 'Inter Tight', sans-serif";

export const SUPER_ADMIN_EMAIL = "bkasero@gmail.com";

export const PHASE_COLORS: Record<string, string> = {
  pre:  "#888780",
  work: "#378ADD",
  post: "#1D9E75",
};

export const TASK_TYPES = {
  tarea:      { label: "Tarea",      color: "#1D9E75", icon: "✓" },
  epica:      { label: "Épica",      color: "#7F77DD", icon: "⬡" },
  iniciativa: { label: "Iniciativa", color: "#2c2c2e", icon: "◈" },
  bug:        { label: "Bug",        color: "#E24B4A", icon: "⚡" },
};

export const PHASE_META = {
  pre:  { label: "Pre-trabajo",  color: "#888780" },
  work: { label: "En trabajo",   color: "#378ADD" },
  post: { label: "Post-trabajo", color: "#1D9E75" },
};

export const HIDE_DONE_OPTIONS = [
  { value: 0,  label: "Nunca ocultar"         },
  { value: 1,  label: "Después de 1 día"      },
  { value: 3,  label: "Después de 3 días"     },
  { value: 5,  label: "Después de 5 días"     },
  { value: 7,  label: "Después de 7 días"     },
  { value: 15, label: "Después de 15 días"    },
  { value: 21, label: "Después de 21 días"    },
  { value: 30, label: "Después de 30 días"    },
];

export const DEFAULT_VISIBLE = [
  "tipo","categoria","estado","dueDate","creador","bloqueado",
  "descripcion","dependencias","comentarios","archivos","tiempos","historial",
];
