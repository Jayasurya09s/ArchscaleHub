-- Orbit Intranet access controls
-- Paste this into Supabase SQL Editor if your intranet_sections table already exists.

alter table intranet_sections
  add column if not exists allowed_dept_id text,
  add column if not exists allowed_roles text[],
  add column if not exists allowed_user_ids text[];

notify pgrst, 'reload schema';
