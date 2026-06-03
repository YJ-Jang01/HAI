create extension if not exists pg_trgm;

create table if not exists shopping_datasets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source_name text not null,
  source_category text not null,
  source_url text,
  subset_strategy text not null default 'capacity_stratified_sampling',
  db_budget_bytes bigint not null default 430000000,
  storage_strategy text not null default 'external_url_with_selective_fallback',
  raw_manifest jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shopping_categories (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references shopping_datasets(id) on delete cascade,
  parent_id uuid references shopping_categories(id) on delete cascade,
  source_path text not null,
  slug text not null,
  name text not null,
  depth integer not null default 0,
  product_count integer not null default 0,
  include_in_seed boolean not null default true,
  exclusion_reason text,
  raw_category jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (dataset_id, source_path),
  unique (dataset_id, slug)
);

create table if not exists shopping_products (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references shopping_datasets(id) on delete cascade,
  source_product_id text not null,
  parent_asin text,
  asin text,
  slug text not null,
  title text not null,
  description_text text,
  price_amount numeric(12, 2),
  currency_code text not null default 'USD',
  brand text,
  store text,
  average_rating numeric(3, 2),
  rating_number integer not null default 0,
  main_category text,
  category_path jsonb not null default '[]'::jsonb,
  features jsonb not null default '[]'::jsonb,
  description jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  raw_metadata jsonb not null,
  raw_metadata_bytes integer not null default 0,
  has_image_url boolean not null default false,
  image_fallback_status text not null default 'not_checked',
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dataset_id, source_product_id),
  unique (dataset_id, slug)
);

create table if not exists shopping_product_category_paths (
  product_id uuid not null references shopping_products(id) on delete cascade,
  category_id uuid not null references shopping_categories(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (product_id, category_id)
);

create table if not exists shopping_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shopping_products(id) on delete cascade,
  source_url text not null,
  variant text not null default 'source',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  status text not null default 'unchecked',
  http_status integer,
  checked_at timestamptz,
  storage_bucket text,
  storage_path text,
  storage_public_url text,
  raw_image jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (product_id, source_url, variant)
);

create table if not exists shopping_product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shopping_products(id) on delete cascade,
  key text not null,
  label text not null,
  value_text text,
  value_number numeric(12, 2),
  value_boolean boolean,
  value_json jsonb,
  source_path text not null,
  is_facet_candidate boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, key, source_path)
);

create table if not exists shopping_reviews (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references shopping_datasets(id) on delete cascade,
  product_id uuid not null references shopping_products(id) on delete cascade,
  source_review_id text not null,
  reviewer_id_hash text,
  rating integer not null,
  title text,
  body text not null,
  helpful_vote integer not null default 0,
  verified_purchase boolean,
  review_timestamp timestamptz,
  unix_review_time integer,
  raw_review jsonb not null,
  raw_review_bytes integer not null default 0,
  imported_at timestamptz not null default now(),
  unique (dataset_id, source_review_id)
);

create table if not exists shopping_review_evidence (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shopping_products(id) on delete cascade,
  review_id uuid not null references shopping_reviews(id) on delete cascade,
  attribute_key text not null,
  attribute_label text not null,
  sentiment text not null,
  evidence_text text not null,
  issue_type text not null default 'none',
  confidence numeric(5, 2),
  source text not null default 'rule_extractor',
  created_at timestamptz not null default now()
);

create table if not exists shopping_import_runs (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid references shopping_datasets(id) on delete set null,
  status text not null default 'started',
  mode text not null default 'profile',
  phase text not null default 'init',
  db_budget_bytes bigint not null default 430000000,
  db_size_before_bytes bigint,
  db_size_after_bytes bigint,
  products_scanned integer not null default 0,
  products_imported integer not null default 0,
  reviews_scanned integer not null default 0,
  reviews_imported integer not null default 0,
  raw_manifest jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists shopping_seed_size_samples (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references shopping_import_runs(id) on delete cascade,
  chunk_number integer not null,
  products_imported integer not null default 0,
  reviews_imported integer not null default 0,
  db_size_bytes bigint not null,
  product_table_bytes bigint,
  review_table_bytes bigint,
  raw_bytes_seen bigint,
  notes text,
  created_at timestamptz not null default now(),
  unique (import_run_id, chunk_number)
);

create index if not exists idx_shopping_categories_dataset_depth on shopping_categories(dataset_id, depth, slug);
create index if not exists idx_shopping_products_dataset_price on shopping_products(dataset_id, price_amount);
create index if not exists idx_shopping_products_dataset_rating on shopping_products(dataset_id, average_rating, rating_number);
create index if not exists idx_shopping_products_dataset_brand on shopping_products(dataset_id, brand);
create index if not exists idx_shopping_products_dataset_store on shopping_products(dataset_id, store);
create index if not exists idx_shopping_products_dataset_category on shopping_products(dataset_id, main_category);
create index if not exists idx_shopping_products_raw_metadata_gin on shopping_products using gin(raw_metadata);
create index if not exists idx_shopping_product_images_product_order on shopping_product_images(product_id, is_primary desc, sort_order);
create index if not exists idx_shopping_product_images_status on shopping_product_images(status, checked_at);
create index if not exists idx_shopping_product_attributes_key_text on shopping_product_attributes(key, value_text);
create index if not exists idx_shopping_product_attributes_key_number on shopping_product_attributes(key, value_number);
create index if not exists idx_shopping_reviews_product_rating on shopping_reviews(product_id, rating);
create index if not exists idx_shopping_reviews_product_time on shopping_reviews(product_id, review_timestamp desc);
create index if not exists idx_shopping_reviews_body_trgm on shopping_reviews using gin(body gin_trgm_ops);
create index if not exists idx_shopping_review_evidence_product_attr on shopping_review_evidence(product_id, attribute_key);
create index if not exists idx_shopping_review_evidence_review on shopping_review_evidence(review_id);
create index if not exists idx_shopping_review_evidence_issue_sentiment on shopping_review_evidence(issue_type, sentiment);
create index if not exists idx_shopping_import_runs_status on shopping_import_runs(status, started_at desc);

alter table shopping_datasets enable row level security;
alter table shopping_categories enable row level security;
alter table shopping_products enable row level security;
alter table shopping_product_category_paths enable row level security;
alter table shopping_product_images enable row level security;
alter table shopping_product_attributes enable row level security;
alter table shopping_reviews enable row level security;
alter table shopping_review_evidence enable row level security;
alter table shopping_import_runs enable row level security;
alter table shopping_seed_size_samples enable row level security;
