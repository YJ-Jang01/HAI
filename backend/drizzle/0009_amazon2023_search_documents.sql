create extension if not exists pg_trgm;

create table if not exists shopping_product_search_documents (
  product_id uuid primary key references shopping_products(id) on delete cascade,
  dataset_id uuid not null references shopping_datasets(id) on delete cascade,
  search_text text not null,
  search_vector tsvector not null,
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_shopping_product_search_documents_dataset
  on shopping_product_search_documents(dataset_id);

create index if not exists idx_shopping_product_search_documents_vector
  on shopping_product_search_documents using gin(search_vector);

create index if not exists idx_shopping_product_search_documents_text_trgm
  on shopping_product_search_documents using gin(search_text gin_trgm_ops);

with documents as (
  select
    product.id as product_id,
    product.dataset_id,
    concat_ws(
      ' ',
      product.title,
      product.description_text,
      product.brand,
      product.store,
      product.main_category,
      product.category_path::text,
      product.features::text,
      product.description::text,
      product.details::text,
      coalesce(attributes.search_text, ''),
      coalesce(reviews.search_text, '')
    ) as search_text
  from shopping_products product
  left join (
    select
      product_id,
      string_agg(concat_ws(' ', key, label, value_text, value_number::text, value_boolean::text, value_json::text, source_path), ' ') as search_text
    from shopping_product_attributes
    group by product_id
  ) attributes on attributes.product_id = product.id
  left join (
    select
      product_id,
      string_agg(concat_ws(' ', title, body), ' ') as search_text
    from shopping_reviews
    group by product_id
  ) reviews on reviews.product_id = product.id
)
insert into shopping_product_search_documents (product_id, dataset_id, search_text, search_vector, updated_at)
select
  product_id,
  dataset_id,
  search_text,
  to_tsvector('simple', search_text),
  now()
from documents
on conflict (product_id) do update set
  dataset_id = excluded.dataset_id,
  search_text = excluded.search_text,
  search_vector = excluded.search_vector,
  updated_at = now();

delete from shopping_product_search_documents document
where not exists (
  select 1
  from shopping_products product
  where product.id = document.product_id
);
