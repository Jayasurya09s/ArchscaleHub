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

alter table drip_enrolments add column if not exists current_node_key text;
alter table drip_enrolments add column if not exists last_node_key text;
alter table drip_enrolments add column if not exists context jsonb default '{}'::jsonb;
