create table if not exists product_categories (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  constraint uq_product_categories_demo_slug unique (demo_site_id, slug)
);

create table if not exists product_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references product_categories(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  constraint uq_product_subcategories_category_slug unique (category_id, slug)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  demo_site_id uuid not null references demo_sites(id) on delete cascade,
  category_id uuid not null references product_categories(id) on delete restrict,
  subcategory_id uuid not null references product_subcategories(id) on delete restrict,
  external_id integer not null,
  slug text not null,
  name text not null,
  keyword text,
  description text not null,
  brand_story text,
  price_amount numeric(12, 2) not null,
  currency_code text not null default 'USD',
  rating numeric(2, 1) not null,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_products_demo_external_id unique (demo_site_id, external_id),
  constraint uq_products_demo_slug unique (demo_site_id, slug),
  constraint ck_products_price_nonnegative check (price_amount >= 0),
  constraint ck_products_rating_range check (rating >= 0 and rating <= 5),
  constraint ck_products_review_count_nonnegative check (review_count >= 0)
);

create table if not exists product_assets (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  asset_type text not null,
  url text not null,
  sort_order integer not null default 0,
  alt_text text,
  constraint uq_product_assets_product_type_order unique (product_id, asset_type, sort_order)
);

create table if not exists product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  feature_text text not null,
  sort_order integer not null default 0,
  constraint uq_product_features_product_order unique (product_id, sort_order)
);

create table if not exists product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  constraint uq_product_option_groups_product_name unique (product_id, name),
  constraint uq_product_option_groups_product_order unique (product_id, sort_order)
);

create table if not exists product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references product_option_groups(id) on delete cascade,
  value text not null,
  sort_order integer not null default 0,
  constraint uq_product_option_values_group_value unique (option_group_id, value),
  constraint uq_product_option_values_group_order unique (option_group_id, sort_order)
);

create table if not exists product_rating_breakdown (
  product_id uuid not null references products(id) on delete cascade,
  rating_value integer not null,
  percentage integer not null,
  primary key (product_id, rating_value),
  constraint ck_product_rating_breakdown_value check (rating_value between 1 and 5),
  constraint ck_product_rating_breakdown_percentage check (percentage between 0 and 100)
);

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  external_id integer not null,
  user_name text not null,
  rating integer not null,
  review_date date not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint uq_product_reviews_product_external_id unique (product_id, external_id),
  constraint ck_product_reviews_rating_range check (rating between 1 and 5)
);

create index if not exists idx_product_categories_demo_order
on product_categories (demo_site_id, sort_order);

create index if not exists idx_product_subcategories_category_order
on product_subcategories (category_id, sort_order);

create index if not exists idx_products_demo_external_id
on products (demo_site_id, external_id);

create index if not exists idx_products_demo_category_external
on products (demo_site_id, category_id, external_id);

create index if not exists idx_products_demo_subcategory_external
on products (demo_site_id, subcategory_id, external_id);

create index if not exists idx_products_category
on products (category_id);

create index if not exists idx_products_subcategory
on products (subcategory_id);

create index if not exists idx_product_assets_product_type_order
on product_assets (product_id, asset_type, sort_order);

create index if not exists idx_product_features_product_order
on product_features (product_id, sort_order);

create index if not exists idx_product_option_groups_product_order
on product_option_groups (product_id, sort_order);

create index if not exists idx_product_option_values_group_order
on product_option_values (option_group_id, sort_order);

create index if not exists idx_product_rating_breakdown_product
on product_rating_breakdown (product_id);

create index if not exists idx_product_reviews_product_date
on product_reviews (product_id, review_date);

create index if not exists idx_product_reviews_product_rating
on product_reviews (product_id, rating);
