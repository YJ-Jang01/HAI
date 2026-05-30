create table if not exists product_review_profiles (
  review_id uuid primary key references product_reviews(id) on delete cascade,
  gender text not null,
  height_cm integer not null,
  body_type text not null,
  usual_size text not null,
  purchased_size text not null,
  fit_result text not null,
  created_at timestamptz not null default now(),
  constraint ck_product_review_profiles_gender check (gender in ('female', 'male', 'nonbinary', 'prefer_not_to_say')),
  constraint ck_product_review_profiles_height check (height_cm between 140 and 210),
  constraint ck_product_review_profiles_body_type check (body_type in ('petite', 'slim', 'average', 'curvy', 'athletic', 'broad_shoulders', 'tall', 'plus')),
  constraint ck_product_review_profiles_fit_result check (fit_result in ('too_small', 'slightly_small', 'true_to_size', 'slightly_large', 'too_large', 'varies_by_body_type'))
);

alter table product_review_evidence
add column if not exists issue_type text not null default 'none';

alter table product_review_evidence
add column if not exists severity integer not null default 0;

alter table product_review_evidence
add column if not exists evidence_value_text text;

alter table product_review_evidence
add column if not exists evidence_value_number numeric(12, 2);

alter table product_review_evidence
add column if not exists evidence_value_boolean boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ck_product_review_evidence_issue_type'
  ) then
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
      'uncomfortable_fit'
    ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ck_product_review_evidence_severity'
  ) then
    alter table product_review_evidence
    add constraint ck_product_review_evidence_severity
    check (severity between 0 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ck_product_review_evidence_single_typed_value'
  ) then
    alter table product_review_evidence
    add constraint ck_product_review_evidence_single_typed_value
    check (
      ((evidence_value_text is not null)::int + (evidence_value_number is not null)::int + (evidence_value_boolean is not null)::int) <= 1
    );
  end if;
end $$;

create index if not exists idx_product_review_profiles_fit_result
on product_review_profiles (fit_result);

create index if not exists idx_product_review_profiles_gender_height_body
on product_review_profiles (gender, height_cm, body_type);

create index if not exists idx_product_review_evidence_issue_sentiment_severity
on product_review_evidence (issue_type, sentiment, severity);

create index if not exists idx_product_review_evidence_attribute_issue
on product_review_evidence (attribute_definition_id, issue_type);
