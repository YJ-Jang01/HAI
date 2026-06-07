alter table shopping_products
add column if not exists localized_text jsonb not null default '{}'::jsonb;

alter table shopping_reviews
add column if not exists localized_text jsonb not null default '{}'::jsonb;

alter table shopping_review_evidence
add column if not exists localized_text jsonb not null default '{}'::jsonb;
