-- Orbit Brand / Portfolio proper tables
-- Paste this into Supabase SQL Editor, then run:
--   POST http://localhost:8787/migrate/snapshot-brand

create extension if not exists pgcrypto;

create table if not exists public.portfolio_items (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  title text not null,
  project_name text,
  client_name text,
  project_category text,
  section text,
  property_type text,
  service_type text,
  city text,
  state_ut text,
  tier_category text,
  project_size text,
  year_completed text,
  short_writeup text,
  challenge text,
  solution text,
  outcome text,
  cover_image_url text,
  cover_image_storage_bucket text,
  cover_image_storage_path text,
  visibility_status text not null default 'Private',
  portfolio_status text not null default 'Saved',
  created_by text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_assets (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  portfolio_item_id text not null references public.portfolio_items(id) on delete cascade,
  asset_type text not null default 'External Link',
  file_name text,
  file_url text,
  external_url text,
  thumbnail_url text,
  storage_bucket text,
  storage_path text,
  file_size bigint,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_tags (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  tag_name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(workspace_id, tag_name)
);

create table if not exists public.portfolio_item_tags (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  portfolio_item_id text not null references public.portfolio_items(id) on delete cascade,
  tag_id text not null references public.portfolio_tags(id) on delete cascade,
  unique (portfolio_item_id, tag_id)
);

create table if not exists public.portfolio_share_links (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  portfolio_item_id text not null references public.portfolio_items(id) on delete cascade,
  token text not null unique,
  public_url text,
  is_active boolean not null default true,
  allow_download boolean not null default true,
  total_views integer not null default 0,
  unique_views integer not null default 0,
  last_viewed_at timestamptz,
  currently_viewing_count integer not null default 0,
  created_by text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_view_events (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  share_link_id text not null references public.portfolio_share_links(id) on delete cascade,
  portfolio_item_id text not null references public.portfolio_items(id) on delete cascade,
  visitor_id text,
  session_id text,
  device_type text,
  browser text,
  user_agent text,
  opened_at timestamptz not null default now(),
  last_activity_at timestamptz,
  closed_at timestamptz,
  duration_seconds integer not null default 0,
  is_currently_viewing boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_portfolio_items_workspace on public.portfolio_items(workspace_id, updated_at desc);
create index if not exists idx_portfolio_items_filters on public.portfolio_items(workspace_id, project_category, property_type, service_type, city, tier_category);
create index if not exists idx_portfolio_assets_item on public.portfolio_assets(portfolio_item_id, display_order);
create index if not exists idx_portfolio_share_token on public.portfolio_share_links(token);
create index if not exists idx_portfolio_view_events_link on public.portfolio_view_events(share_link_id, opened_at desc);

alter table public.portfolio_items enable row level security;
alter table public.portfolio_assets enable row level security;
alter table public.portfolio_tags enable row level security;
alter table public.portfolio_item_tags enable row level security;
alter table public.portfolio_share_links enable row level security;
alter table public.portfolio_view_events enable row level security;

drop policy if exists "portfolio_items_demo_all" on public.portfolio_items;
create policy "portfolio_items_demo_all" on public.portfolio_items for all using (true) with check (true);

drop policy if exists "portfolio_assets_demo_all" on public.portfolio_assets;
create policy "portfolio_assets_demo_all" on public.portfolio_assets for all using (true) with check (true);

drop policy if exists "portfolio_tags_demo_all" on public.portfolio_tags;
create policy "portfolio_tags_demo_all" on public.portfolio_tags for all using (true) with check (true);

drop policy if exists "portfolio_item_tags_demo_all" on public.portfolio_item_tags;
create policy "portfolio_item_tags_demo_all" on public.portfolio_item_tags for all using (true) with check (true);

drop policy if exists "portfolio_share_links_demo_all" on public.portfolio_share_links;
create policy "portfolio_share_links_demo_all" on public.portfolio_share_links for all using (true) with check (true);

drop policy if exists "portfolio_view_events_demo_all" on public.portfolio_view_events;
create policy "portfolio_view_events_demo_all" on public.portfolio_view_events for all using (true) with check (true);

select
  exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portfolio_items') as portfolio_items_exists,
  exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portfolio_assets') as portfolio_assets_exists,
  exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'portfolio_share_links') as portfolio_share_links_exists;

notify pgrst, 'reload schema';
