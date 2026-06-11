# Orbit Final Auth Restore Backup

Created: 2026-06-07T01:46:40.258Z

## Includes
- Current app source with Supabase Auth, login, Platform Admin, and tenant-switching updates.
- Package files and build configuration.
- Supabase schema SQL files.
- Supabase table-content exports in `supabase-tables/*.json`.
- Seed JSON files in `src/data`.
- Private archive includes local env files if present.
- Shareable archive excludes env files, node_modules, dist, and previous backup archives.

## Supabase Export Summary
- Tables exported successfully: 36
- Tables failed/skipped: 1
- activities: 4 rows
- announcements: 2 rows
- companies: 4 rows
- contacts: 6 rows
- deals: 4 rows
- departments: 12 rows
- drip_campaigns: 1 rows
- drip_edges: 8 rows
- drip_enrolments: 1 rows
- drip_events: 5 rows
- drip_nodes: 8 rows
- ideas: 10 rows
- important_dates: 55 rows
- intranet_content: 12 rows
- intranet_content_attachments: 0 rows
- intranet_sections: 7 rows
- message_logs: 17 rows
- message_templates: 4 rows
- pipelines: 1 rows
- platform_memberships: 9 rows
- platform_organizations: 5 rows
- platform_role_audit: 0 rows
- platform_workspace_snapshots: 0 rows
- platform_workspaces: 4 rows
- portfolio_assets: 77 rows
- portfolio_item_tags: 0 rows
- portfolio_items: 19 rows
- portfolio_share_links: 10 rows
- portfolio_view_events: 4 rows
- quick_links: 3 rows
- reminder_rules: 3 rows
- task_templates: 6 rows
- tasks: 11 rows
- users: 21 rows
- wa_connections: 1 rows
- workspace_settings: 2 rows

## Export Warnings
- task_files: Could not find the table 'public.task_files' in the schema cache

## Local API Runtime State
- `http://127.0.0.1:8787/state` was not reachable during this backup.
- Current durable data is preserved through Supabase table exports and seed JSON files.

## Restore Order
1. Extract the private archive.
2. Run `npm install`.
3. Add `.env` values if they are not already present.
4. Run Supabase SQL schema files if restoring to a new Supabase project.
5. Import table JSON files into matching Supabase tables if restoring row content.
6. Run `npm run api` and `npm run dev`.
7. Open `/login` and sign in with a Supabase Auth user whose email exists in `platform_memberships`.
