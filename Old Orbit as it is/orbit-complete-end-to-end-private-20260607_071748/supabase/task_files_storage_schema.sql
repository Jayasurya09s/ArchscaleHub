create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'orbit-task-attachments',
  'orbit-task-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/webm',
    'video/mp4',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  bucket text not null default 'orbit-task-attachments',
  storage_path text not null,
  original_name text not null,
  display_name text,
  mime_type text,
  file_kind text check (file_kind in ('attachment','voice_note','image','document','other')) default 'attachment',
  size_bytes bigint,
  public_url text,
  signed_url_expires_at timestamptz,
  uploaded_by uuid references users(id) on delete set null,
  source_module text default 'tasks',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(bucket, storage_path)
);

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  task_legacy_id text,
  file_id uuid references workspace_files(id) on delete cascade,
  attachment_type text check (attachment_type in ('attachment','voice_note')) default 'attachment',
  sort int default 0,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  check (task_id is not null or task_legacy_id is not null)
);

create index if not exists idx_workspace_files_workspace on workspace_files(workspace_id);
create index if not exists idx_workspace_files_storage_path on workspace_files(bucket, storage_path);
create index if not exists idx_task_attachments_task_id on task_attachments(task_id);
create index if not exists idx_task_attachments_task_legacy_id on task_attachments(task_legacy_id);
create index if not exists idx_task_attachments_file_id on task_attachments(file_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_workspace_files_updated_at on workspace_files;
create trigger set_workspace_files_updated_at
before update on workspace_files
for each row execute function set_updated_at();

drop trigger if exists set_task_attachments_updated_at on task_attachments;
create trigger set_task_attachments_updated_at
before update on task_attachments
for each row execute function set_updated_at();

notify pgrst, 'reload schema';
