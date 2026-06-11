import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('Usage: node scripts/export-supabase-tables.mjs <backup-dir>');
  process.exit(1);
}

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );
};

const env = {
  ...readEnvFile('.env'),
  ...readEnvFile('.env.local'),
  ...process.env,
};

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const tableNames = [
  'activities',
  'announcements',
  'companies',
  'contacts',
  'deals',
  'departments',
  'drip_campaigns',
  'drip_edges',
  'drip_enrolments',
  'drip_events',
  'drip_nodes',
  'ideas',
  'important_dates',
  'intranet_content',
  'intranet_content_attachments',
  'intranet_sections',
  'message_logs',
  'message_templates',
  'pipelines',
  'platform_memberships',
  'platform_organizations',
  'platform_role_audit',
  'platform_workspace_snapshots',
  'platform_workspaces',
  'portfolio_assets',
  'portfolio_item_tags',
  'portfolio_items',
  'portfolio_share_links',
  'portfolio_view_events',
  'quick_links',
  'reminder_rules',
  'task_templates',
  'task_files',
  'tasks',
  'users',
  'wa_connections',
  'workspace_settings',
];

const outputDir = path.join(backupDir, 'supabase-tables');
fs.mkdirSync(outputDir, { recursive: true });

const manifest = {
  exportedAt: new Date().toISOString(),
  supabaseUrl: supabaseUrl ? supabaseUrl.replace(/\/$/, '') : null,
  usedKeyType: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY ? 'service-role-or-secret' : env.VITE_SUPABASE_ANON_KEY ? 'anon' : 'none',
  tables: {},
};

if (!supabaseUrl || !supabaseKey) {
  manifest.error = 'Supabase URL/key not found in .env, .env.local, or process env. Table content export skipped.';
  fs.writeFileSync(path.join(outputDir, 'EXPORT-MANIFEST.json'), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(manifest, null, 2));
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

for (const tableName of tableNames) {
  const tableManifest = { ok: false, rowCount: 0 };
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    tableManifest.ok = true;
    tableManifest.rowCount = typeof count === 'number' ? count : rows.length;
    fs.writeFileSync(path.join(outputDir, `${tableName}.json`), JSON.stringify(rows, null, 2));
  } catch (error) {
    tableManifest.error = error.message || String(error);
  }
  manifest.tables[tableName] = tableManifest;
}

fs.writeFileSync(path.join(outputDir, 'EXPORT-MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
