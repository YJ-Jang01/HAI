create index if not exists idx_products_demo_price_external
on products (demo_site_id, price_amount, external_id);

create index if not exists idx_products_demo_rating_external
on products (demo_site_id, rating desc, external_id);

create index if not exists idx_products_demo_review_count_external
on products (demo_site_id, review_count desc, external_id);
