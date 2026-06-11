-- Orbit tenant hardening migration
-- Run this AFTER supabase_organizations_workspaces_schema.sql.
--
-- Purpose:
-- 1. Backfill all existing operational rows into the main Orbit organization/workspace.
-- 2. Add organization_id + workspace_id tenant columns to module tables.
-- 3. Enable RLS so users can only access rows inside their organization/workspace.
-- 4. Keep public portfolio slideshow links readable without opening admin writes.

create extension if not exists pgcrypto;

-- Deterministic IDs from supabase_organizations_workspaces_schema.sql
do $orbit$
declare
  default_org uuid := '00000000-0000-0000-0000-000000000101';
  default_ws uuid := '00000000-0000-0000-0000-000000000201';
begin
  if to_regclass('public.platform_organizations') is null
     or to_regclass('public.platform_workspaces') is null
     or to_regclass('public.platform_memberships') is null then
    raise exception 'Run supabase_organizations_workspaces_schema.sql before this tenant hardening migration.';
  end if;

  insert into public.platform_organizations (id, name, slug, status, plan, owner_name, owner_email, region, metadata)
  values (default_org, 'Orbit Internal Demo', 'orbit-internal-demo', 'active', 'internal', 'Shanker De', 'shankerde@gmail.com', 'India', '{"purpose":"real internal/demo tenant"}'::jsonb)
  on conflict (id) do nothing;

  insert into public.platform_workspaces (id, organization_id, name, slug, status, kind, timezone, metadata)
  values (default_ws, default_org, 'Main Workspace', 'main', 'active', 'internal', 'Asia/Kolkata', '{"is_primary":true}'::jsonb)
  on conflict (id) do nothing;

  if to_regclass('public.workspaces') is not null then
    insert into public.workspaces (id, name)
    values (default_ws, 'Main Workspace')
    on conflict (id) do nothing;

    alter table public.workspaces add column if not exists organization_id uuid;
    execute format('alter table public.workspaces alter column organization_id set default %L::uuid', default_org);

    update public.workspaces w
    set organization_id = coalesce(pw.organization_id, default_org)
    from public.platform_workspaces pw
    where w.id = pw.id and w.organization_id is null;

    update public.workspaces
    set organization_id = default_org
    where organization_id is null;

    alter table public.workspaces alter column organization_id drop default;
  end if;
end $orbit$;

create or replace function public.current_platform_email()
returns text
language plpgsql
stable
as $orbit$
declare
  claims jsonb := '{}'::jsonb;
  email_from_setting text;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := '{}'::jsonb;
  end;

  email_from_setting := nullif(current_setting('request.jwt.claim.email', true), '');

  return lower(nullif(coalesce(auth.email(), claims->>'email', email_from_setting), ''));
end;
$orbit$;

create or replace function public.can_manage_platform()
returns boolean
language sql
stable
security definer
set search_path = public
as $orbit$
  select exists (
    select 1
    from public.platform_memberships m
    where m.status = 'active'
      and m.role in ('super_admin', 'product_admin')
      and (
        m.user_id = auth.uid()
        or lower(m.email) = public.current_platform_email()
      )
  );
$orbit$;

create or replace function public.can_manage_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $orbit$
  select exists (
    select 1
    from public.platform_memberships m
    where m.status = 'active'
      and (
        m.user_id = auth.uid()
        or lower(m.email) = public.current_platform_email()
      )
      and (
        m.role in ('super_admin', 'product_admin')
        or (m.organization_id = p_organization_id and m.role in ('studio_owner', 'admin'))
      )
  );
$orbit$;

create or replace function public.can_access_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $orbit$
  select public.can_manage_platform()
    or exists (
      select 1
      from public.platform_memberships m
      where m.status = 'active'
        and m.organization_id = p_organization_id
        and (
          m.user_id = auth.uid()
          or lower(m.email) = public.current_platform_email()
        )
    );
$orbit$;

create or replace function public.can_access_workspace(p_organization_id uuid, p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $orbit$
  select public.can_manage_platform()
    or exists (
      select 1
      from public.platform_memberships m
      where m.status = 'active'
        and m.organization_id = p_organization_id
        and (
          m.user_id = auth.uid()
          or lower(m.email) = public.current_platform_email()
        )
        and (
          m.workspace_id is null
          or p_workspace_id is null
          or m.workspace_id = p_workspace_id
        )
    );
$orbit$;

-- Add tenant columns to all real module tables that already exist.
do $orbit$
declare
  default_org uuid := '00000000-0000-0000-0000-000000000101';
  default_ws uuid := '00000000-0000-0000-0000-000000000201';
  module_table text;
  module_tables text[] := array[
    -- core / org
    'departments', 'users', 'workspace_settings',
    -- tasks / ideas
    'tasks', 'task_templates', 'ideas',
    -- CRM
    'pipelines', 'companies', 'contacts', 'deals', 'activities',
    -- WhatsApp / marketing / automation
    'message_templates', 'reminder_rules', 'drip_campaigns', 'drip_nodes', 'drip_edges',
    'drip_events', 'drip_enrolments', 'wa_connections', 'message_logs',
    -- files
    'workspace_files', 'task_attachments',
    -- intranet
    'intranet_sections', 'intranet_content', 'intranet_content_attachments',
    'announcements', 'quick_links', 'important_dates',
    -- brand / portfolio
    'portfolio_items', 'portfolio_assets', 'portfolio_tags', 'portfolio_item_tags',
    'portfolio_share_links', 'portfolio_view_events',
    -- future/document module names, applied only if those tables exist
    'document_requests', 'document_events', 'document_templates', 'doc_express_documents',
    'doc_express_files', 'doc_express_events', 'contracts', 'contract_files',
    'vendor_catalogue_items', 'vendor_portal_access_requests'
  ];
  org_constraint text;
  ws_constraint text;
begin
  foreach module_table in array module_tables
  loop
    if to_regclass(format('public.%I', module_table)) is not null then
      execute format('alter table public.%I add column if not exists organization_id uuid', module_table);
      execute format('alter table public.%I add column if not exists workspace_id uuid', module_table);

      execute format('alter table public.%I alter column organization_id set default %L::uuid', module_table, default_org);
      execute format('alter table public.%I alter column workspace_id set default %L::uuid', module_table, default_ws);

      execute format(
        'update public.%I t
         set workspace_id = %L::uuid
         where workspace_id is null
            or not exists (select 1 from public.platform_workspaces pw where pw.id = t.workspace_id)',
        module_table,
        default_ws
      );

      execute format(
        'update public.%I t
         set organization_id = coalesce(
           (select pw.organization_id from public.platform_workspaces pw where pw.id = t.workspace_id),
           %L::uuid
         )
         where organization_id is null
            or not exists (select 1 from public.platform_organizations po where po.id = t.organization_id)',
        module_table,
        default_org
      );

      execute format('alter table public.%I alter column organization_id set not null', module_table);
      execute format('alter table public.%I alter column workspace_id set not null', module_table);
      execute format('alter table public.%I alter column organization_id drop default', module_table);
      execute format('alter table public.%I alter column workspace_id drop default', module_table);

      org_constraint := left(module_table || '_tenant_org_fkey', 60);
      ws_constraint := left(module_table || '_tenant_ws_fkey', 60);

      if not exists (select 1 from pg_constraint where conname = org_constraint) then
        execute format(
          'alter table public.%I add constraint %I foreign key (organization_id) references public.platform_organizations(id) on delete restrict',
          module_table,
          org_constraint
        );
      end if;

      if not exists (select 1 from pg_constraint where conname = ws_constraint) then
        execute format(
          'alter table public.%I add constraint %I foreign key (workspace_id) references public.platform_workspaces(id) on delete restrict',
          module_table,
          ws_constraint
        );
      end if;

      execute format('create index if not exists %I on public.%I (organization_id, workspace_id)', 'idx_' || left(module_table, 45) || '_tenant', module_table);
    end if;
  end loop;
end $orbit$;

-- Link the legacy public.workspaces table to platform organizations too.
do $orbit$
declare
  constraint_name text := 'workspaces_tenant_org_fkey';
begin
  if to_regclass('public.workspaces') is not null then
    if not exists (select 1 from pg_constraint where conname = constraint_name) then
      alter table public.workspaces
        add constraint workspaces_tenant_org_fkey
        foreign key (organization_id) references public.platform_organizations(id) on delete restrict;
    end if;

    create index if not exists idx_workspaces_tenant on public.workspaces(organization_id);
  end if;
end $orbit$;

-- Enable tenant RLS on platform tables.
alter table public.platform_organizations enable row level security;
alter table public.platform_workspaces enable row level security;
alter table public.platform_memberships enable row level security;
alter table public.platform_role_audit enable row level security;
alter table public.platform_workspace_snapshots enable row level security;

drop policy if exists orbit_platform_org_select on public.platform_organizations;
create policy orbit_platform_org_select
on public.platform_organizations
for select
using (public.can_access_organization(id));

drop policy if exists orbit_platform_org_write on public.platform_organizations;
create policy orbit_platform_org_write
on public.platform_organizations
for all
using (public.can_manage_platform())
with check (public.can_manage_platform());

drop policy if exists orbit_platform_workspace_select on public.platform_workspaces;
create policy orbit_platform_workspace_select
on public.platform_workspaces
for select
using (public.can_access_workspace(organization_id, id));

drop policy if exists orbit_platform_workspace_write on public.platform_workspaces;
create policy orbit_platform_workspace_write
on public.platform_workspaces
for all
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists orbit_platform_membership_select on public.platform_memberships;
create policy orbit_platform_membership_select
on public.platform_memberships
for select
using (public.can_access_workspace(organization_id, workspace_id));

drop policy if exists orbit_platform_membership_write on public.platform_memberships;
create policy orbit_platform_membership_write
on public.platform_memberships
for all
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));

drop policy if exists orbit_platform_audit_select on public.platform_role_audit;
create policy orbit_platform_audit_select
on public.platform_role_audit
for select
using (organization_id is null or public.can_access_workspace(organization_id, workspace_id));

drop policy if exists orbit_platform_audit_insert on public.platform_role_audit;
create policy orbit_platform_audit_insert
on public.platform_role_audit
for insert
with check (organization_id is null or public.can_manage_organization(organization_id));

drop policy if exists orbit_platform_snapshot_select on public.platform_workspace_snapshots;
create policy orbit_platform_snapshot_select
on public.platform_workspace_snapshots
for select
using (public.can_access_workspace(organization_id, workspace_id));

drop policy if exists orbit_platform_snapshot_insert on public.platform_workspace_snapshots;
create policy orbit_platform_snapshot_insert
on public.platform_workspace_snapshots
for insert
with check (public.can_access_workspace(organization_id, workspace_id));

-- Enable RLS and tenant policies on every real module table.
do $orbit$
declare
  module_table text;
  module_tables text[] := array[
    'departments', 'users', 'workspace_settings',
    'tasks', 'task_templates', 'ideas',
    'pipelines', 'companies', 'contacts', 'deals', 'activities',
    'message_templates', 'reminder_rules', 'drip_campaigns', 'drip_nodes', 'drip_edges',
    'drip_events', 'drip_enrolments', 'wa_connections', 'message_logs',
    'workspace_files', 'task_attachments',
    'intranet_sections', 'intranet_content', 'intranet_content_attachments',
    'announcements', 'quick_links', 'important_dates',
    'portfolio_items', 'portfolio_assets', 'portfolio_tags', 'portfolio_item_tags',
    'portfolio_share_links', 'portfolio_view_events',
    'document_requests', 'document_events', 'document_templates', 'doc_express_documents',
    'doc_express_files', 'doc_express_events', 'contracts', 'contract_files',
    'vendor_catalogue_items', 'vendor_portal_access_requests'
  ];
begin
  foreach module_table in array module_tables
  loop
    if to_regclass(format('public.%I', module_table)) is not null then
      execute format('alter table public.%I enable row level security', module_table);

      execute format('drop policy if exists orbit_tenant_select on public.%I', module_table);
      execute format('drop policy if exists orbit_tenant_insert on public.%I', module_table);
      execute format('drop policy if exists orbit_tenant_update on public.%I', module_table);
      execute format('drop policy if exists orbit_tenant_delete on public.%I', module_table);

      execute format(
        'create policy orbit_tenant_select on public.%I for select using (public.can_access_workspace(organization_id, workspace_id))',
        module_table
      );
      execute format(
        'create policy orbit_tenant_insert on public.%I for insert with check (public.can_access_workspace(organization_id, workspace_id))',
        module_table
      );
      execute format(
        'create policy orbit_tenant_update on public.%I for update using (public.can_access_workspace(organization_id, workspace_id)) with check (public.can_access_workspace(organization_id, workspace_id))',
        module_table
      );
      execute format(
        'create policy orbit_tenant_delete on public.%I for delete using (public.can_access_workspace(organization_id, workspace_id))',
        module_table
      );

      execute format('grant select, insert, update, delete on table public.%I to authenticated', module_table);
    end if;
  end loop;
end $orbit$;

-- Legacy workspaces needs a custom RLS policy because its workspace id is the primary key.
do $orbit$
begin
  if to_regclass('public.workspaces') is not null then
    alter table public.workspaces enable row level security;

    drop policy if exists orbit_workspaces_select on public.workspaces;
    create policy orbit_workspaces_select
    on public.workspaces
    for select
    using (public.can_access_workspace(organization_id, id));

    drop policy if exists orbit_workspaces_insert on public.workspaces;
    create policy orbit_workspaces_insert
    on public.workspaces
    for insert
    with check (public.can_manage_organization(organization_id));

    drop policy if exists orbit_workspaces_update on public.workspaces;
    create policy orbit_workspaces_update
    on public.workspaces
    for update
    using (public.can_manage_organization(organization_id))
    with check (public.can_manage_organization(organization_id));

    drop policy if exists orbit_workspaces_delete on public.workspaces;
    create policy orbit_workspaces_delete
    on public.workspaces
    for delete
    using (public.can_manage_organization(organization_id));

    grant select, insert, update, delete on table public.workspaces to authenticated;
  end if;
end $orbit$;

-- Replace old demo-open portfolio policies with real tenant/public-link policies.
do $orbit$
declare
  t text;
begin
  foreach t in array array[
    'portfolio_items', 'portfolio_assets', 'portfolio_tags', 'portfolio_item_tags',
    'portfolio_share_links', 'portfolio_view_events'
  ]
  loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_demo_all', t);
    end if;
  end loop;
end $orbit$;

do $orbit$
begin
  if to_regclass('public.portfolio_share_links') is not null then
    drop policy if exists portfolio_share_links_public_select on public.portfolio_share_links;
    create policy portfolio_share_links_public_select
    on public.portfolio_share_links
    for select
    using (is_active = true);

    grant select on table public.portfolio_share_links to anon;
  end if;

  if to_regclass('public.portfolio_items') is not null
     and to_regclass('public.portfolio_share_links') is not null then
    drop policy if exists portfolio_items_public_share_select on public.portfolio_items;
    create policy portfolio_items_public_share_select
    on public.portfolio_items
    for select
    using (
      exists (
        select 1
        from public.portfolio_share_links l
        where l.portfolio_item_id = public.portfolio_items.id
          and l.workspace_id = public.portfolio_items.workspace_id
          and l.is_active = true
      )
    );

    grant select on table public.portfolio_items to anon;
  end if;

  if to_regclass('public.portfolio_assets') is not null
     and to_regclass('public.portfolio_share_links') is not null then
    drop policy if exists portfolio_assets_public_share_select on public.portfolio_assets;
    create policy portfolio_assets_public_share_select
    on public.portfolio_assets
    for select
    using (
      exists (
        select 1
        from public.portfolio_share_links l
        where l.portfolio_item_id = public.portfolio_assets.portfolio_item_id
          and l.workspace_id = public.portfolio_assets.workspace_id
          and l.is_active = true
      )
    );

    grant select on table public.portfolio_assets to anon;
  end if;

  if to_regclass('public.portfolio_view_events') is not null
     and to_regclass('public.portfolio_share_links') is not null then
    drop policy if exists portfolio_view_events_public_insert on public.portfolio_view_events;
    create policy portfolio_view_events_public_insert
    on public.portfolio_view_events
    for insert
    with check (
      exists (
        select 1
        from public.portfolio_share_links l
        where l.id = public.portfolio_view_events.share_link_id
          and l.workspace_id = public.portfolio_view_events.workspace_id
          and l.is_active = true
      )
    );

    drop policy if exists portfolio_view_events_public_update on public.portfolio_view_events;
    create policy portfolio_view_events_public_update
    on public.portfolio_view_events
    for update
    using (
      exists (
        select 1
        from public.portfolio_share_links l
        where l.id = public.portfolio_view_events.share_link_id
          and l.workspace_id = public.portfolio_view_events.workspace_id
          and l.is_active = true
      )
    )
    with check (
      exists (
        select 1
        from public.portfolio_share_links l
        where l.id = public.portfolio_view_events.share_link_id
          and l.workspace_id = public.portfolio_view_events.workspace_id
          and l.is_active = true
      )
    );

    grant insert, update on table public.portfolio_view_events to anon;
  end if;
end $orbit$;

-- Quick verification output.
select
  'tenant_hardening_ready' as status,
  exists (select 1 from public.platform_organizations where id = '00000000-0000-0000-0000-000000000101') as main_organization_exists,
  exists (select 1 from public.platform_workspaces where id = '00000000-0000-0000-0000-000000000201') as main_workspace_exists;

notify pgrst, 'reload schema';
