create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Orbit Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  email text,
  whatsapp text,
  role text check (role in ('admin','manager','member','user')),
  dept_id uuid references departments(id),
  reports_to uuid references users(id),
  status text default 'active',
  app_access text[],
  color text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  stages jsonb not null default '[]'::jsonb,
  form jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  type text,
  city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  whatsapp text not null,
  email text,
  company_id uuid references companies(id) on delete set null,
  role text,
  pipeline_id uuid references pipelines(id),
  stage text,
  tags text[],
  city text,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  contact_id uuid references contacts(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  stage text,
  value numeric,
  expected_close date,
  owner_id uuid references users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  deal_id uuid references deals(id) on delete set null,
  type text,
  note text,
  at date,
  by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  description text,
  type text,
  dept_id uuid references departments(id),
  assigned_by uuid references users(id),
  assigned_to uuid references users(id),
  manager_id uuid references users(id),
  priority text,
  status text,
  due timestamptz,
  start_date date,
  end_date date,
  focus boolean default false,
  focus_date date,
  recurring boolean default false,
  estimate_minutes int,
  channels jsonb default '{}'::jsonb,
  reminders jsonb default '[]'::jsonb,
  checklist jsonb default '[]'::jsonb,
  tags text[],
  watchers uuid[],
  dependencies jsonb default '{}'::jsonb,
  comments jsonb default '[]'::jsonb,
  activity jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text,
  tags text[],
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  use_case text,
  body text,
  status text default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists reminder_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  trigger_type text,
  condition text,
  delay_minutes int,
  recipient_type text,
  template_id uuid references message_templates(id),
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists drip_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  channel text,
  status text default 'draft',
  pipeline_id uuid references pipelines(id),
  audience jsonb default '{}'::jsonb,
  steps jsonb default '[]'::jsonb,
  flow jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table drip_campaigns add column if not exists flow jsonb default '{}'::jsonb;

create table if not exists drip_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  campaign_id uuid references drip_campaigns(id) on delete cascade,
  node_key text not null,
  node_type text not null,
  title text,
  config jsonb default '{}'::jsonb,
  position jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(campaign_id, node_key)
);

create table if not exists drip_edges (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  campaign_id uuid references drip_campaigns(id) on delete cascade,
  edge_key text not null,
  source_node_key text not null,
  target_node_key text not null,
  source_handle text,
  label text,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique(campaign_id, edge_key)
);

create table if not exists drip_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  campaign_id uuid references drip_campaigns(id) on delete cascade,
  enrolment_id uuid references drip_enrolments(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  event_type text not null,
  node_key text,
  provider_message_id text,
  payload jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists drip_enrolments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  campaign_id uuid references drip_campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  current_node_key text,
  last_node_key text,
  step_index int default 0,
  status text default 'active',
  last_opened boolean default false,
  last_clicked boolean default false,
  enrolled_at date default current_date,
  next_run_at timestamptz,
  context jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table drip_enrolments add column if not exists current_node_key text;
alter table drip_enrolments add column if not exists last_node_key text;
alter table drip_enrolments add column if not exists context jsonb default '{}'::jsonb;

create table if not exists wa_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  provider text,
  phone_number text,
  phone_number_id text,
  waba_id text,
  status text default 'disconnected',
  health text,
  last_connected_at timestamptz,
  last_message_at timestamptz,
  daily_limit int,
  sent_today int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  recipient text,
  number text,
  type text,
  related_module text,
  related_record_id uuid,
  provider_message_id text,
  status text default 'queued',
  error text,
  sent_by text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

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

create table if not exists intranet_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text,
  icon text,
  color text,
  description text,
  parent_id uuid references intranet_sections(id),
  sort int,
  visibility text,
  allowed_dept_id text,
  allowed_roles text[],
  allowed_user_ids text[],
  status text,
  ai_search boolean default true,
  comments boolean default true,
  versioning boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists intranet_content (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  section_id uuid references intranet_sections(id) on delete cascade,
  title text,
  type text,
  status text,
  excerpt text,
  body text,
  tags text[],
  author text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

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

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  title text,
  body text,
  at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists quick_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  label text,
  url text,
  at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists important_dates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text,
  category text,
  start_date date,
  end_date date,
  recurrence text,
  scope text,
  status text,
  mode text,
  city text,
  country text,
  venue text,
  discipline_tags text[],
  official_link text,
  notes text,
  approx boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text,
  tz_primary text,
  tz_additional text[],
  permissions jsonb default '{}'::jsonb,
  dash_widgets jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_contacts_workspace on contacts(workspace_id);
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_deals_contact on deals(contact_id);
create index if not exists idx_tasks_due on tasks(due);
create index if not exists idx_drip_enrolments_next_run on drip_enrolments(next_run_at) where status = 'active';
create index if not exists idx_message_logs_provider_message_id on message_logs(provider_message_id);
create index if not exists idx_workspace_files_workspace on workspace_files(workspace_id);
create index if not exists idx_workspace_files_storage_path on workspace_files(bucket, storage_path);
create index if not exists idx_task_attachments_task_id on task_attachments(task_id);
create index if not exists idx_task_attachments_task_legacy_id on task_attachments(task_legacy_id);
create index if not exists idx_task_attachments_file_id on task_attachments(file_id);
create index if not exists idx_intranet_content_attachments_content_id on intranet_content_attachments(content_id);
create index if not exists idx_intranet_content_attachments_content_legacy_id on intranet_content_attachments(content_legacy_id);
create index if not exists idx_intranet_content_attachments_file_id on intranet_content_attachments(file_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workspaces','departments','users','pipelines','companies','contacts','deals','activities',
    'tasks','task_templates','ideas','message_templates','reminder_rules','drip_campaigns',
    'drip_enrolments','wa_connections','message_logs','workspace_files','task_attachments','intranet_sections','intranet_content','intranet_content_attachments',
    'announcements','quick_links','important_dates','workspace_settings'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on %I', t, t);
    execute format('create trigger set_%I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

notify pgrst, 'reload schema';
