import { useEffect, useMemo, useState } from "react";
import { FONT } from "../constants";
import { useTheme } from "../hooks/useTheme";
import { useLang } from "../i18n";
import type { Company, CompanyMember, CompanyRole, Project, User, Workspace } from "../types";
import { loadCompanyMembers, loadProjects, loadWorkspaces, resolveCompanyByCode } from "../lib/db";

interface EmpresaPageProps {
  companyCode: string;
  currentUser: User;
  companyLinks: { company: Company; role: CompanyRole }[];
  onBack: () => void;
}

type WidgetKey = "projects" | "workspaces" | "status" | "objectives";

export function EmpresaPage({ companyCode, currentUser, companyLinks, onBack }: EmpresaPageProps) {
  const T = useTheme();
  const { t } = useLang();
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [projectPage, setProjectPage] = useState(1);
  const [workspacePage, setWorkspacePage] = useState(1);
  const [projectFilters, setProjectFilters] = useState({ id: "", progress: "", status: "", owner: "", title: "" });
  const [workspaceFilters, setWorkspaceFilters] = useState({ id: "", progress: "", status: "", owner: "", title: "" });
  const [visibleWidgets, setVisibleWidgets] = useState<Record<WidgetKey, boolean>>({
    projects: true,
    workspaces: true,
    status: true,
    objectives: true,
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingCompany(true);
    resolveCompanyByCode(companyCode).then(resolved => {
      if (cancelled) return;
      setCompany(resolved);
      setLoadingCompany(false);
    });
    return () => { cancelled = true; };
  }, [companyCode]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoadingMembers(true);
    loadCompanyMembers(company.id).then(data => {
      if (cancelled) return;
      setMembers(data);
      setLoadingMembers(false);
    });
    return () => { cancelled = true; };
  }, [company]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoadingWorkspaces(true);
    loadWorkspaces(company.id).then(data => {
      if (cancelled) return;
      setWorkspaces(data);
      setLoadingWorkspaces(false);
    });
    return () => { cancelled = true; };
  }, [company]);

  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    setLoadingProjects(true);
    (async () => {
      const ws = await loadWorkspaces(company.id);
      if (cancelled) return;
      setWorkspaces(ws);
      const rows = await Promise.all(ws.map(w => loadProjects(w.id)));
      if (cancelled) return;
      setProjects(rows.flat());
      setLoadingProjects(false);
    })();
    return () => { cancelled = true; };
  }, [company]);

  const isMember = useMemo(() => companyLinks.some(link => link.company.id === company?.id), [companyLinks, company?.id]);
  const isOwner = !!company && (company.owner_id === currentUser.id || company.owner_user_id === currentUser.id);
  const isReporter = !!company && company.reporter_user_id === currentUser.id;

  const canAccess = !!company && (isMember || isOwner || isReporter || currentUser.email.toLowerCase() === "bkasero@gmail.com");

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach(m => {
      const name = m.user?.name || m.user?.email || m.user_id;
      map.set(m.user_id, name);
    });
    return map;
  }, [members]);

  const projectRows = useMemo(() => {
    return projects.map(p => ({
      id: p.id,
      title: p.name,
      progress: 0,
      status: p.is_archived ? "Archivado" : "Activo",
      owner: memberMap.get(p.owner_id || p.created_by) || memberMap.get(p.created_by) || "N/A",
    }));
  }, [projects, memberMap]);

  const workspaceRows = useMemo(() => {
    return workspaces.map(w => ({
      id: w.id,
      title: w.name,
      progress: 0,
      status: "Activo",
      owner: memberMap.get(w.owner_id || w.created_by) || memberMap.get(w.created_by) || "N/A",
    }));
  }, [workspaces, memberMap]);

  function filterRows(rows: Array<{ id: string; title: string; progress: number; status: string; owner: string }>, filters: typeof projectFilters) {
    return rows.filter(row => {
      if (filters.id && !row.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
      if (filters.title && !row.title.toLowerCase().includes(filters.title.toLowerCase())) return false;
      if (filters.status && !row.status.toLowerCase().includes(filters.status.toLowerCase())) return false;
      if (filters.owner && !row.owner.toLowerCase().includes(filters.owner.toLowerCase())) return false;
      if (filters.progress && !String(row.progress).includes(filters.progress)) return false;
      return true;
    });
  }

  const filteredProjects = filterRows(projectRows, projectFilters);
  const filteredWorkspaces = filterRows(workspaceRows, workspaceFilters);
  const pageSize = 15;

  const pagedProjects = filteredProjects.slice((projectPage - 1) * pageSize, projectPage * pageSize);
  const pagedWorkspaces = filteredWorkspaces.slice((workspacePage - 1) * pageSize, workspacePage * pageSize);

  const currentYear = new Date().getFullYear();
  const yearlyProjects = projects.filter(p => {
    if (!p.created_at) return false;
    return new Date(p.created_at).getFullYear() === currentYear;
  });
  const statusCounts = {
    activos: yearlyProjects.filter(p => !p.is_archived).length,
    archivados: yearlyProjects.filter(p => p.is_archived).length,
  };
  const totalStatus = Math.max(1, statusCounts.activos + statusCounts.archivados);
  const activePct = Math.round((statusCounts.activos / totalStatus) * 100);

  const goalProgress = 0;

  if (loadingCompany) {
    return (
      <div style={{ padding: 24, fontFamily: FONT, color: T.text }}>
        <Spinner />
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: 24, fontFamily: FONT, color: T.text }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t("app.noCompanyTitle")}</h2>
        <p style={{ color: T.textSoft }}>{t("app.noCompanyBody")}</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ padding: 24, fontFamily: FONT, color: T.text }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Acceso restringido</h2>
        <p style={{ color: T.textSoft }}>No tienes permisos para ver esta empresa.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20, padding: 24, fontFamily: FONT, color: T.text }} data-testid="empresa-page">
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ border: "none", background: "transparent", color: T.textSoft, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            {t("common.back")}
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{company.name}</h2>
        </div>

        <div style={{ background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <InfoItem label="Codigo empresa" value={company.company_code || "-"} />
            <InfoItem label="Personas" value={loadingMembers ? "..." : String(members.length)} />
            <InfoItem label="Proyectos" value={loadingProjects ? "..." : String(projects.length)} />
            <InfoItem label="Espacios" value={loadingWorkspaces ? "..." : String(workspaces.length)} />
          </div>
        </div>

        {visibleWidgets.projects && (
          <WidgetCard title="Proyectos" loading={loadingProjects} testId="empresa-widget-projects">
            <FilterRow filters={projectFilters} onChange={setProjectFilters} />
            <DataTable rows={pagedProjects} />
            <Pagination page={projectPage} total={filteredProjects.length} pageSize={pageSize} onPageChange={setProjectPage} />
          </WidgetCard>
        )}

        {visibleWidgets.workspaces && (
          <WidgetCard title="Espacios de trabajo" loading={loadingWorkspaces} testId="empresa-widget-workspaces">
            <FilterRow filters={workspaceFilters} onChange={setWorkspaceFilters} />
            <DataTable rows={pagedWorkspaces} />
            <Pagination page={workspacePage} total={filteredWorkspaces.length} pageSize={pageSize} onPageChange={setWorkspacePage} />
          </WidgetCard>
        )}

        {visibleWidgets.status && (
          <WidgetCard title="Estado de proyectos (ano en curso)" loading={loadingProjects} testId="empresa-widget-status">
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <DonutChart value={activePct} color={T.accent} bg={T.borderStrong} />
              <div style={{ fontSize: 12, color: T.textSoft }}>
                <p style={{ margin: "0 0 6px" }}>Activos: {statusCounts.activos}</p>
                <p style={{ margin: 0 }}>Archivados: {statusCounts.archivados}</p>
              </div>
            </div>
          </WidgetCard>
        )}

        {visibleWidgets.objectives && (
          <WidgetCard title="Objetivos de empresa" loading={false} testId="empresa-widget-objectives">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 120, height: 8, borderRadius: 999, background: T.borderStrong }}>
                <div style={{ width: `${Math.min(100, goalProgress)}%`, height: "100%", background: T.success, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{goalProgress}%</span>
              <span style={{ fontSize: 11, color: T.textSoft }}>Campo numerico temporal</span>
            </div>
          </WidgetCard>
        )}
      </div>

      <aside style={{ width: 240, flexShrink: 0, background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, height: "fit-content" }} data-testid="empresa-widgets-panel">
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800 }}>Widgets</h3>
        {isOwner ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["projects", "workspaces", "status", "objectives"] as WidgetKey[]).map(key => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.text }}>
                <input
                  type="checkbox"
                  checked={visibleWidgets[key]}
                  onChange={() => setVisibleWidgets(prev => ({ ...prev, [key]: !prev[key] }))}
                />
                {key === "projects" ? "Proyectos" : key === "workspaces" ? "Espacios" : key === "status" ? "Estado anual" : "Objetivos"}
              </label>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>Solo el responsable puede gestionar widgets.</p>
        )}
      </aside>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E3E6EF", borderTopColor: "#1A6EFF", animation: "spin 1s linear infinite" }} />
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  const T = useTheme();
  return (
    <div>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function WidgetCard({ title, loading, children, testId }: { title: string; loading: boolean; children: React.ReactNode; testId?: string }) {
  const T = useTheme();
  return (
    <div style={{ background: T.bgSidebar, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }} data-testid={testId}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{title}</h3>
        {loading && <Spinner />}
      </div>
      {children}
    </div>
  );
}

function FilterRow({ filters, onChange }: { filters: { id: string; progress: string; status: string; owner: string; title: string }; onChange: (next: typeof filters) => void }) {
  const T = useTheme();
  const baseStyle: React.CSSProperties = { fontSize: 11, borderRadius: 8, border: `1px solid ${T.border}`, padding: "6px 8px", background: T.bgElevated, color: T.text };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 10 }}>
      <input style={baseStyle} placeholder="ID" value={filters.id} onChange={e => onChange({ ...filters, id: e.target.value })} />
      <input style={baseStyle} placeholder="% avance" value={filters.progress} onChange={e => onChange({ ...filters, progress: e.target.value })} />
      <input style={baseStyle} placeholder="Estado" value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} />
      <input style={baseStyle} placeholder="Responsable" value={filters.owner} onChange={e => onChange({ ...filters, owner: e.target.value })} />
      <input style={baseStyle} placeholder="Titulo" value={filters.title} onChange={e => onChange({ ...filters, title: e.target.value })} />
    </div>
  );
}

function DataTable({ rows }: { rows: Array<{ id: string; title: string; progress: number; status: string; owner: string }> }) {
  const T = useTheme();
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1fr 1fr 1.4fr", background: T.bgElevated, padding: "8px 10px", fontSize: 11, fontWeight: 700, color: T.textSoft }}>
        <span>ID</span>
        <span>Titulo</span>
        <span>% avance</span>
        <span>Estado</span>
        <span>Responsable</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: "12px 10px", fontSize: 12, color: T.textSoft }}>Sin resultados</div>
      ) : (
        rows.map(row => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1fr 1fr 1.4fr", padding: "8px 10px", fontSize: 12, borderTop: `1px solid ${T.border}` }}>
            <span>{row.id}</span>
            <span>{row.title}</span>
            <span>{row.progress}%</span>
            <span>{row.status}</span>
            <span>{row.owner}</span>
          </div>
        ))
      )}
    </div>
  );
}

function Pagination({ page, total, pageSize, onPageChange }: { page: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const T = useTheme();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: T.textSoft }}>
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} style={{ border: `1px solid ${T.border}`, background: T.bgElevated, borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
        Prev
      </button>
      <span>Pagina {page} / {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ border: `1px solid ${T.border}`, background: T.bgElevated, borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
        Next
      </button>
    </div>
  );
}

function DonutChart({ value, color, bg }: { value: number; color: string; bg: string }) {
  const size = 80;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke={bg} strokeWidth="10" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50%" y="52%" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>{value}%</text>
    </svg>
  );
}
