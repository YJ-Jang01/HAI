create extension if not exists pgcrypto;

create table if not exists demo_sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists media_items (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null,
  content_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_media_items_demo_slug unique (demo_site_id, slug)
);

create table if not exists media_tags (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  slug text not null,
  label text not null,
  constraint uq_media_tags_demo_slug unique (demo_site_id, slug)
);

create table if not exists media_item_tags (
  media_item_id uuid not null references media_items(id) on delete cascade,
  tag_id uuid not null references media_tags(id) on delete cascade,
  primary key (media_item_id, tag_id)
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references media_items(id) on delete cascade,
  asset_type text not null,
  url text not null,
  sort_order integer not null default 0,
  alt_text text,
  constraint uq_media_assets_item_type_order unique (media_item_id, asset_type, sort_order)
);

create table if not exists media_episodes (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references media_items(id) on delete cascade,
  season_number integer not null default 1,
  episode_number integer not null,
  title text not null,
  description text not null,
  duration_seconds integer not null,
  sort_order integer not null default 0,
  constraint uq_media_episodes_item_episode unique (media_item_id, season_number, episode_number)
);

create table if not exists media_episode_assets (
  id uuid primary key default gen_random_uuid(),
  media_episode_id uuid not null references media_episodes(id) on delete cascade,
  asset_type text not null,
  url text not null,
  sort_order integer not null default 0,
  constraint uq_media_episode_assets_episode_type_order unique (media_episode_id, asset_type, sort_order)
);

create table if not exists media_shelves (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  constraint uq_media_shelves_demo_key unique (demo_site_id, key)
);

create table if not exists media_hero_items (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  title_override text,
  description_override text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint uq_media_hero_items_demo_order unique (demo_site_id, sort_order)
);

create table if not exists media_shelf_items (
  shelf_id uuid not null references media_shelves(id) on delete cascade,
  media_item_id uuid not null references media_items(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (shelf_id, media_item_id),
  constraint uq_media_shelf_items_shelf_order unique (shelf_id, sort_order)
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

create index if not exists idx_media_item_tags_tag_item
on media_item_tags (tag_id, media_item_id);

create index if not exists idx_media_assets_item_type_order
on media_assets (media_item_id, asset_type, sort_order);

create index if not exists idx_media_episodes_item_order
on media_episodes (media_item_id, season_number, episode_number);

create index if not exists idx_media_episode_assets_episode_type_order
on media_episode_assets (media_episode_id, asset_type, sort_order);

create index if not exists idx_media_shelves_demo_order
on media_shelves (demo_site_id, sort_order);

create index if not exists idx_media_shelf_items_shelf_order
on media_shelf_items (shelf_id, sort_order);

create index if not exists idx_media_hero_items_demo_active_order
on media_hero_items (demo_site_id, is_active, sort_order);

create index if not exists idx_interaction_logs_session_time
on interaction_logs (session_id, created_at);

create index if not exists idx_interaction_logs_demo_time
on interaction_logs (demo_site_id, created_at);
