import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function loadCompanySnapshot(companyId) {
  const [{ data: workspaces }, { data: boards }, { data: improvements }, { data: settings }, { data: features }] =
    await Promise.all([
      supabase.from("workspaces").select("*").eq("company_id", companyId),
      supabase.from("boards").select("*").eq("company_id", companyId),
      supabase.from("improvements").select("*").eq("company_id", companyId),
      supabase.from("company_settings").select("*").eq("company_id", companyId).maybeSingle(),
      supabase.from("company_features").select("*").eq("company_id", companyId),
    ]);

  const workspaceIds = (workspaces || []).map(w => w.id);
  const { data: projects } = workspaceIds.length
    ? await supabase.from("projects").select("*").in("workspace_id", workspaceIds)
    : { data: [] };

  const boardIds = (boards || []).map(b => b.id);
  const [statesRes, columnsRes, cardsRes] = boardIds.length
    ? await Promise.all([
        supabase.from("board_states").select("*").in("board_id", boardIds),
        supabase.from("board_columns").select("*").in("board_id", boardIds),
        supabase.from("cards").select("*").in("board_id", boardIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  return {
    workspaces: workspaces || [],
    projects: projects || [],
    boards: boards || [],
    states: statesRes.data || [],
    columns: columnsRes.data || [],
    cards: cardsRes.data || [],
    improvements: improvements || [],
    settings: settings || null,
    features: features || [],
  };
}

async function cleanupLogs(companyId, retentionDays) {
  if (!retentionDays || retentionDays <= 0) return;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("board_logs")
    .delete()
    .eq("company_id", companyId)
    .lt("created_at", cutoff);
}

async function enforceBackupRetention(companyId, keepCount) {
  const keep = Math.max(1, keepCount || 10);
  const { data: backups } = await supabase
    .from("company_backups")
    .select("id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  const toDelete = (backups || []).slice(keep).map(b => b.id);
  if (!toDelete.length) return;
  await supabase.from("company_backups").delete().in("id", toDelete);
}

async function createBackup(companyId, createdBy, summary) {
  const snapshot = await loadCompanySnapshot(companyId);
  const backupRow = {
    id: crypto.randomUUID(),
    company_id: companyId,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    summary,
    snapshot,
  };
  await supabase.from("company_backups").insert(backupRow);
  const retention = snapshot.settings?.backup_retention_count ?? 10;
  await enforceBackupRetention(companyId, retention);
  await cleanupLogs(companyId, snapshot.settings?.log_retention_days ?? 0);
}

async function run() {
  const { data: companies } = await supabase.from("companies").select("*").eq("is_active", true);
  if (!companies || companies.length === 0) {
    console.log("No active companies.");
    return;
  }

  for (const company of companies) {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .eq("company_id", company.id)
      .maybeSingle();
    const enabled = settings?.backup_enabled ?? true;
    if (!enabled) {
      await cleanupLogs(company.id, settings?.log_retention_days ?? 0);
      continue;
    }
    await createBackup(company.id, company.created_by, "Backup diario 1AM Madrid");
    console.log(`Backup generado: ${company.name}`);
  }
}

run().catch(err => {
  console.error("Backup error:", err);
  process.exit(1);
});
