# Supabase

Supabase is used as managed Postgres for the AImazon Amazon Reviews 2023 Fashion dataset. The browser never connects directly to Supabase; `backend/` is the only runtime that should use `DATABASE_URL`.

## Source Of Truth

- Drizzle schema: `backend/src/db/schema.ts`
- SQL migrations: `backend/drizzle/`
- Runtime API: `backend/src/routes/amazon2023.ts` and `backend/src/routes/amazon2023-ai.ts`
- Import/enrichment scripts: `backend/scripts/`

## Free Plan Constraints

The current planning target is Supabase Free:

- Database: 500 MB
- Storage: 1 GB

Operational rules:

- Store product image URLs in Postgres.
- Store fallback thumbnails in Supabase Storage only for products whose remote image URLs fail.
- Do not store image binaries in Postgres.
- Do not duplicate raw metadata blobs or full review text in new semantic tables.
- Store semantic attributes as compact product-level rows with `score`, `confidence`, `evidenceCount`, sentiment counts, and source.
- Check DB size before and after migrations/imports.
- Treat 485-490 MB as the practical warning zone.

## Setup

1. Create a Supabase project.
2. Copy a Postgres URI with SSL enabled.
3. Put it in `backend/.env` as `DATABASE_URL`.
4. Run migrations from `backend/`.

```powershell
cd backend
pnpm install
pnpm run db:migrate
pnpm run db:verify:amazon2023
```

Example placeholder:

```text
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
DATABASE_SSL=true
```

Do not commit real credentials.

## Current Tables

- `demo_sites`
- `interaction_logs`
- `shopping_datasets`
- `shopping_categories`
- `shopping_products`
- `shopping_product_category_paths`
- `shopping_product_images`
- `shopping_product_attributes`
- `shopping_product_semantic_attributes`
- `shopping_product_search_documents`
- `shopping_reviews`
- `shopping_review_evidence`
- `shopping_import_runs`
- `shopping_seed_size_samples`

## Amazon 2023 Import Flow

Run only after backing up any Supabase data that should be preserved:

```powershell
cd backend
pnpm run db:backup:supabase -- -IUnderstandFullRowBackup
pnpm run dataset:profile:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz>
pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json --db-budget-mb 500
pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json
pnpm run dataset:semantic:schema:amazon2023
pnpm run dataset:semantic:amazon2023 -- --dataset-slug amazon-fashion-2023 --mode apply --max-db-mb 490
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 490
```

## Verification Commands

```powershell
pnpm run db:verify:amazon2023
pnpm run dataset:images:amazon2023
pnpm run ai:qa:amazon2023
pnpm run clarification:qa:amazon2023
```

`db:verify:amazon` is an alias to the Amazon 2023 verifier for compatibility. Prefer `db:verify:amazon2023`.

## Indexing Rule

Keep indexes tied to frontend and AI query paths:

- product/category lookup
- price/rating sort and filters
- search document lookup
- high-frequency semantic filters such as gender, occasion, season, style, material
- evidence lookup by product and attribute key

Avoid broad indexes that push the Free plan database over the size target.

## Study Safety

- Do not reseed during a study run unless logs and catalog state are backed up.
- Do not manually edit production rows during a study.
- Do not put service-role keys, database passwords, participant data, or private logs into frontend files.
