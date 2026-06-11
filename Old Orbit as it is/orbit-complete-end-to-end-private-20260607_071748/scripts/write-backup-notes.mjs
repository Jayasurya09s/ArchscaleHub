import fs from 'node:fs';
import path from 'node:path';

const backupDir = process.argv[2];
if (!backupDir) {
  console.error('Usage: node scripts/write-backup-notes.mjs <backup-dir>');
  process.exit(1);
}

const manifestPath = path.join(backupDir, 'supabase-tables', 'EXPORT-MANIFEST.json');
const supabaseManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : { tables: {}, error: 'Supabase export manifest not found.' };

const okTables = Object.entries(supabaseManifest.tables || {}).filter(([, value]) => value.ok);
const failedTables = Object.entries(supabaseManifest.tables || {}).filter(([, value]) => !value.ok);

const notes = [
  '# Orbit Final Auth Restore Backup',
  '',
  `Created: ${new Date().toISOString()}`,
  '',
  '## Includes',
  '- Current app source with Supabase Auth, login, Platform Admin, and tenant-switching updates.',
  '- Package files and build configuration.',
  '- Supabase schema SQL files.',
  '- Supabase table-content exports in `supabase-tables/*.json`.',
  '- Seed JSON files in `src/data`.',
  '- Private archive includes local env files if present.',
  '- Shareable archive excludes env files, node_modules, dist, and previous backup archives.',
  '',
  '## Supabase Export Summary',
  `- Tables exported successfully: ${okTables.length}`,
  `- Tables failed/skipped: ${failedTables.length}`,
  ...okTables.map(([table, value]) => `- ${table}: ${value.rowCount} rows`),
  '',
  ...(failedTables.length
    ? [
        '## Export Warnings',
        ...failedTables.map(([table, value]) => `- ${table}: ${value.error || 'not exported'}`),
        '',
      ]
    : []),
  '## Local API Runtime State',
  '- `http://127.0.0.1:8787/state` was not reachable during this backup.',
  '- Current durable data is preserved through Supabase table exports and seed JSON files.',
  '',
  '## Restore Order',
  '1. Extract the private archive.',
  '2. Run `npm install`.',
  '3. Add `.env` values if they are not already present.',
  '4. Run Supabase SQL schema files if restoring to a new Supabase project.',
  '5. Import table JSON files into matching Supabase tables if restoring row content.',
  '6. Run `npm run api` and `npm run dev`.',
  '7. Open `/login` and sign in with a Supabase Auth user whose email exists in `platform_memberships`.',
  '',
].join('\n');

fs.writeFileSync(path.join(backupDir, 'RESTORE-NOTES.md'), notes);
fs.writeFileSync(
  path.join(backupDir, 'BACKUP-MANIFEST.json'),
  JSON.stringify({
    createdAt: new Date().toISOString(),
    supabaseExport: supabaseManifest,
    localApiStateReachable: false,
  }, null, 2)
);

console.log(JSON.stringify({
  backupDir,
  okTables: okTables.length,
  failedTables: failedTables.length,
}, null, 2));
