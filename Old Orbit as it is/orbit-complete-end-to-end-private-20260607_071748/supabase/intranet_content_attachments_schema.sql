-- Orbit Intranet content attachments
-- Paste this into Supabase SQL Editor if your main schema already exists.

create table if not exists intranet_content_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  content_id uuid references intranet_content(id) on delete cascade,
  content_legacy_id text,
  file_id uuid references workspace_files(id) on delete cascade,
  attachment_type text check (attachment_type in ('attachment','video','voice_note','image')) default 'attachment',
  sort int default 0,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  check (content_id is not null or content_legacy_id is not null)
);

create index if not exists idx_intranet_content_attachments_content_id
  on intranet_content_attachments(content_id);

create index if not exists idx_intranet_content_attachments_content_legacy_id
  on intranet_content_attachments(content_legacy_id);

create index if not exists idx_intranet_content_attachments_file_id
  on intranet_content_attachments(file_id);

drop trigger if exists set_intranet_content_attachments_updated_at on intranet_content_attachments;
create trigger set_intranet_content_attachments_updated_at
before update on intranet_content_attachments
for each row execute function set_updated_at();

notify pgrst, 'reload schema';
