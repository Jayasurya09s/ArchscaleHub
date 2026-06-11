-- Orbit Platform / Organization / Workspace schema
-- Paste this whole file into Supabase SQL Editor and click Run.
-- Supabase remains the database/brain. Cloudflare R2 or Supabase Storage can remain the file cabinet.

create extension if not exists pgcrypto;

create table if not exists public.platform_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'demo', 'sandbox', 'suspended', 'archived')),
  plan text not null default 'trial',
  owner_name text,
  owner_email text,
  region text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  status text not null default 'active' check (status in ('active', 'demo', 'sandbox', 'suspended', 'archived')),
  kind text not null default 'studio' check (kind in ('internal', 'studio', 'client_demo', 'sandbox')),
  timezone text not null default 'Asia/Kolkata',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations(id) on delete cascade,
  workspace_id uuid references public.platform_workspaces(id) on delete cascade,
  user_id uuid,
  email text,
  display_name text,
  role text not null check (role in ('super_admin', 'product_admin', 'studio_owner', 'admin', 'manager', 'member', 'client', 'vendor')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended', 'archived')),
  app_access text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or email is not null)
);

create table if not exists public.platform_role_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.platform_organizations(id) on delete set null,
  workspace_id uuid references public.platform_workspaces(id) on delete set null,
  actor_email text,
  target_email text,
  action text not null,
  previous_role text,
  next_role text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_workspace_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.platform_organizations(id) on delete cascade,
  workspace_id uuid not null references public.platform_workspaces(id) on delete cascade,
  snapshot_kind text not null default 'manual' check (snapshot_kind in ('manual', 'autosave', 'import', 'demo_seed')),
  payload jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now()
);

create or replace function public.platform_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists platform_organizations_set_updated_at on public.platform_organizations;
create trigger platform_organizations_set_updated_at
before update on public.platform_organizations
for each row execute function public.platform_set_updated_at();

drop trigger if exists platform_workspaces_set_updated_at on public.platform_workspaces;
create trigger platform_workspaces_set_updated_at
before update on public.platform_workspaces
for each row execute function public.platform_set_updated_at();

drop trigger if exists platform_memberships_set_updated_at on public.platform_memberships;
create trigger platform_memberships_set_updated_at
before update on public.platform_memberships
for each row execute function public.platform_set_updated_at();

create index if not exists platform_workspaces_organization_idx on public.platform_workspaces(organization_id);
create index if not exists platform_memberships_org_workspace_idx on public.platform_memberships(organization_id, workspace_id);
create index if not exists platform_memberships_email_idx on public.platform_memberships(lower(email));
create index if not exists platform_role_audit_org_workspace_idx on public.platform_role_audit(organization_id, workspace_id, created_at desc);
create index if not exists platform_workspace_snapshots_org_workspace_idx on public.platform_workspace_snapshots(organization_id, workspace_id, created_at desc);

insert into public.platform_organizations (id, name, slug, status, plan, owner_name, owner_email, region, metadata)
values
  ('00000000-0000-0000-0000-000000000101', 'Orbit Internal Demo', 'orbit-internal-demo', 'active', 'internal', 'Shanker De', 'shankerde@gmail.com', 'India', '{"purpose":"real internal/demo tenant"}'),
  ('00000000-0000-0000-0000-000000000102', 'Client Demo 1', 'client-demo-1', 'demo', 'trial', 'Demo Owner', null, 'India', '{"purpose":"safe client demo tenant"}'),
  ('00000000-0000-0000-0000-000000000103', 'Client Demo 2', 'client-demo-2', 'demo', 'trial', 'Demo Owner', null, 'India', '{"purpose":"safe client demo tenant"}'),
  ('00000000-0000-0000-0000-000000000104', 'Sandbox', 'sandbox', 'sandbox', 'sandbox', 'Product Team', null, 'India', '{"purpose":"experiments only"}')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  plan = excluded.plan,
  owner_name = excluded.owner_name,
  owner_email = excluded.owner_email,
  region = excluded.region,
  metadata = public.platform_organizations.metadata || excluded.metadata;

insert into public.platform_workspaces (id, organization_id, name, slug, status, kind, timezone, metadata)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Main Workspace', 'main', 'active', 'internal', 'Asia/Kolkata', '{"is_primary":true}'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'Client Demo Workspace 1', 'client-demo-1', 'demo', 'client_demo', 'Asia/Kolkata', '{"is_demo":true}'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', 'Client Demo Workspace 2', 'client-demo-2', 'demo', 'client_demo', 'Asia/Kolkata', '{"is_demo":true}'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000104', 'Sandbox Workspace', 'sandbox', 'sandbox', 'sandbox', 'Asia/Kolkata', '{"is_sandbox":true}')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  kind = excluded.kind,
  timezone = excluded.timezone,
  metadata = public.platform_workspaces.metadata || excluded.metadata;

insert into public.platform_memberships (id, organization_id, workspace_id, email, display_name, role, status, app_access, metadata)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 'shankerde@gmail.com', 'Shanker De', 'super_admin', 'active', array['admin','plans','people','projects','brand','marketing','crm','intranet','docExpress'], '{"seeded":true}'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', 'shankerde@gmail.com', 'Shanker De', 'super_admin', 'active', array['admin','plans','people','projects','brand','marketing','crm','intranet','docExpress'], '{"seeded":true}'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000203', 'shankerde@gmail.com', 'Shanker De', 'super_admin', 'active', array['admin','plans','people','projects','brand','marketing','crm','intranet','docExpress'], '{"seeded":true}'),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000204', 'shankerde@gmail.com', 'Shanker De', 'super_admin', 'active', array['admin','plans','people','projects','brand','marketing','crm','intranet','docExpress'], '{"seeded":true}')
on conflict (id) do update set
  organization_id = excluded.organization_id,
  workspace_id = excluded.workspace_id,
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  status = excluded.status,
  app_access = excluded.app_access,
  metadata = public.platform_memberships.metadata || excluded.metadata;

-- Optional but recommended later:
-- Add `organization_id uuid` and `workspace_id uuid` columns to every operational table
-- (tasks, users, contacts, deals, portfolio items, intranet content, etc.) and backfill them
-- with the active workspace IDs above before enabling strict tenant filtering.
