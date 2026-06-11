alter table drip_enrolments add column if not exists current_node_key text;
alter table drip_enrolments add column if not exists last_node_key text;
alter table drip_enrolments add column if not exists context jsonb default '{}'::jsonb;
