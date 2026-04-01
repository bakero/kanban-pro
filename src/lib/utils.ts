import type { User, HistoryEntry } from "../types";

export const uid = () => Math.random().toString(36).slice(2, 9);

export const nowStr = () => new Date().toLocaleString("es-ES");

export const daysSince = (ts: number) =>
  Math.max(0, Math.floor((Date.now() - ts) / 86400000));

export const formatDur = (ms: number): string => {
  if (!ms || ms <= 0) return "—";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const nameInitials = (n: string) =>
  n.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");

export const strColor = (s: string): string => {
  const COLS = ["#7F77DD","#1D9E75","#D85A30","#378ADD","#D4537E","#BA7517","#639922","#E24B4A"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return COLS[Math.abs(h) % COLS.length];
};

export const genPrefix = (name: string): string => {
  const w = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!w.length) return "KAN";
  if (w.length === 1) return w[0].slice(0, 6).padEnd(3, "X");
  return w.map(x => x[0]).join("").slice(0, 6).padEnd(3, "X");
};

export const histEntry = (msg: string, user?: User): HistoryEntry => ({
  ts: nowStr(), msg, userId: user?.id, userName: user?.name || "Sistema",
});
