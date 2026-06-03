create extension if not exists pg_trgm;

create index if not exists idx_shopping_products_title_trgm
  on shopping_products using gin(title gin_trgm_ops);

create index if not exists idx_shopping_products_description_trgm
  on shopping_products using gin(description_text gin_trgm_ops);

create index if not exists idx_shopping_products_brand_trgm
  on shopping_products using gin(brand gin_trgm_ops);

create index if not exists idx_shopping_products_store_trgm
  on shopping_products using gin(store gin_trgm_ops);

create index if not exists idx_shopping_products_main_category_trgm
  on shopping_products using gin(main_category gin_trgm_ops);

create index if not exists idx_shopping_product_attributes_value_text_trgm
  on shopping_product_attributes using gin(value_text gin_trgm_ops);

create index if not exists idx_shopping_product_attributes_label_trgm
  on shopping_product_attributes using gin(label gin_trgm_ops);

create index if not exists idx_shopping_reviews_title_trgm
  on shopping_reviews using gin(title gin_trgm_ops);

create index if not exists idx_shopping_categories_name_trgm
  on shopping_categories using gin(name gin_trgm_ops);

create index if not exists idx_shopping_categories_source_path_trgm
  on shopping_categories using gin(source_path gin_trgm_ops);

create index if not exists idx_shopping_product_category_paths_category_product
  on shopping_product_category_paths(category_id, product_id);

create index if not exists idx_shopping_reviews_dataset_product
  on shopping_reviews(dataset_id, product_id);
