create table if not exists shopping_product_semantic_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references shopping_products(id) on delete cascade,
  dataset_id uuid not null references shopping_datasets(id) on delete cascade,
  key text not null,
  value_text text,
  value_number numeric(8, 3),
  value_boolean boolean,
  score numeric(6, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  evidence_count integer not null default 0,
  positive_count integer not null default 0,
  negative_count integer not null default 0,
  neutral_count integer not null default 0,
  source text not null default 'hybrid',
  source_version text not null default 'amazon2023_semantic_v1',
  updated_at timestamptz not null default now()
);

create index if not exists idx_shopping_product_semantic_product_key
  on shopping_product_semantic_attributes(product_id, key);

create index if not exists idx_shopping_product_semantic_dataset_key_text
  on shopping_product_semantic_attributes(dataset_id, key, value_text);

create index if not exists idx_shopping_product_semantic_dataset_key_number
  on shopping_product_semantic_attributes(dataset_id, key, value_number);

create unique index if not exists uq_shopping_product_semantic_value
  on shopping_product_semantic_attributes (
    product_id,
    key,
    source_version,
    coalesce(value_text, ''),
    coalesce(value_number::text, ''),
    coalesce(value_boolean::text, '')
  );
