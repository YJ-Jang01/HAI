create extension if not exists pgcrypto;

create table if not exists demo_sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists interaction_logs (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  session_id text not null,
  participant_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_interaction_logs_session_time
on interaction_logs (session_id, created_at);

create index if not exists idx_interaction_logs_demo_time
on interaction_logs (demo_site_id, created_at);
