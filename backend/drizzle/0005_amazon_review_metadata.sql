alter table product_reviews
add column if not exists helpful_votes integer not null default 0;

alter table product_reviews
add column if not exists verified_purchase boolean not null default true;

alter table product_reviews
add column if not exists review_source text not null default 'synthetic_demo';

alter table product_reviews
add column if not exists review_images_count integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ck_product_reviews_helpful_votes'
  ) then
    alter table product_reviews
    add constraint ck_product_reviews_helpful_votes
    check (helpful_votes >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ck_product_reviews_images_count'
  ) then
    alter table product_reviews
    add constraint ck_product_reviews_images_count
    check (review_images_count >= 0);
  end if;

  alter table product_review_evidence
  drop constraint if exists ck_product_review_evidence_issue_type;

  alter table product_review_evidence
  add constraint ck_product_review_evidence_issue_type
  check (issue_type in (
    'none',
    'sizing_issue',
    'too_heavy',
    'too_thin',
    'too_warm',
    'not_breathable',
    'scratchy_material',
    'color_mismatch',
    'wrinkles_easily',
    'hard_to_wash',
    'shrinks_after_wash',
    'weak_durability',
    'not_waterproof_enough',
    'poor_value_for_price',
    'uncomfortable_fit',
    'pilling',
    'odor_issue',
    'transparent_fabric',
    'strap_discomfort',
    'poor_arch_support',
    'slippery_sole',
    'zipper_issue',
    'insufficient_storage',
    'see_through',
    'length_issue'
  ));
end $$;

create index if not exists idx_product_reviews_product_helpful
on product_reviews (product_id, helpful_votes desc);

create index if not exists idx_product_reviews_verified_source
on product_reviews (verified_purchase, review_source);
