create table if not exists product_attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  key text not null,
  label text not null,
  data_type text not null,
  unit text,
  min_value numeric(12, 2),
  max_value numeric(12, 2),
  description text not null,
  is_filterable boolean not null default true,
  is_range_facet boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_product_attribute_definitions_demo_key unique (demo_site_id, key),
  constraint ck_product_attribute_definitions_data_type check (data_type in ('text', 'number', 'boolean', 'enum')),
  constraint ck_product_attribute_definitions_range check (
    min_value is null or max_value is null or min_value <= max_value
  )
);

create table if not exists product_attribute_options (
  id uuid primary key default gen_random_uuid(),
  attribute_definition_id uuid not null references product_attribute_definitions(id) on delete cascade,
  value text not null,
  label text not null,
  sort_order integer not null default 0,
  constraint uq_product_attribute_options_definition_value unique (attribute_definition_id, value)
);

create table if not exists product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  attribute_definition_id uuid not null references product_attribute_definitions(id) on delete cascade,
  option_id uuid references product_attribute_options(id) on delete restrict,
  value_text text,
  value_number numeric(12, 2),
  value_boolean boolean,
  source text not null default 'generated',
  human_review_status text not null default 'generated',
  created_at timestamptz not null default now(),
  constraint uq_product_attribute_values_product_definition unique (product_id, attribute_definition_id),
  constraint ck_product_attribute_values_status check (human_review_status in ('generated', 'reviewed', 'approved')),
  constraint ck_product_attribute_values_single_value check (
    ((option_id is not null)::int + (value_text is not null)::int + (value_number is not null)::int + (value_boolean is not null)::int) = 1
  )
);

create table if not exists product_review_evidence (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references product_reviews(id) on delete cascade,
  attribute_definition_id uuid not null references product_attribute_definitions(id) on delete cascade,
  sentiment text not null,
  evidence_text text not null,
  source text not null default 'generated',
  human_review_status text not null default 'generated',
  created_at timestamptz not null default now(),
  constraint ck_product_review_evidence_sentiment check (sentiment in ('positive', 'neutral', 'negative')),
  constraint ck_product_review_evidence_status check (human_review_status in ('generated', 'reviewed', 'approved'))
);

create index if not exists idx_product_attribute_definitions_demo_order
on product_attribute_definitions (demo_site_id, sort_order);

create index if not exists idx_product_attribute_options_definition_order
on product_attribute_options (attribute_definition_id, sort_order);

create index if not exists idx_product_attribute_values_product_definition
on product_attribute_values (product_id, attribute_definition_id);

create index if not exists idx_product_attribute_values_definition_number
on product_attribute_values (attribute_definition_id, value_number);

create index if not exists idx_product_attribute_values_definition_boolean
on product_attribute_values (attribute_definition_id, value_boolean);

create index if not exists idx_product_attribute_values_definition_option
on product_attribute_values (attribute_definition_id, option_id);

create index if not exists idx_product_review_evidence_review
on product_review_evidence (review_id);

create index if not exists idx_product_review_evidence_attribute
on product_review_evidence (attribute_definition_id);
