# Amazon Reviews 2023 Cutover Runbook

This runbook replaces the synthetic Amazon seed with the Amazon Reviews 2023 fashion catalog path.

Do not run live cutover steps until a full row-data backup is explicitly approved and completed.

## 1. Backup Gate

The current schema/size manifest is not a full restore point. Before modifying live Supabase data, create a full row backup locally.

Requirements:

- Use `pg_dump` 17.x or a Supabase CLI version compatible with the project's Postgres 17 server.
- Write backups under `backend/backups/`; this path is gitignored.
- Do not print or commit `DATABASE_URL` or service-role credentials.

Preferred PowerShell command:

```powershell
cd backend
pnpm run db:backup:supabase -- -IUnderstandFullRowBackup
```

This script loads `DATABASE_URL` from the environment or `backend/.env`, refuses to run without the explicit approval flag, requires `pg_dump` and `pg_restore` 17.x or newer, writes the dump and restore-list files under `backend/backups/`, and avoids passing the database URL as a command-line argument.

Manual equivalent:

```powershell
cd backend
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force "backups" | Out-Null
pg_dump --format=custom --no-owner --no-acl --file "backups/supabase-full-$stamp.dump"
pg_restore --list "backups/supabase-full-$stamp.dump" > "backups/supabase-full-$stamp.restore-list.txt"
```

Stop if `pg_dump` reports a client/server major-version mismatch.

Fallback when `pg_dump` 17.x is not available:

```powershell
cd backend
pnpm run db:backup:rows -- --i-understand-full-row-backup
```

This exports every row in the selected app schema, `public` by default, into JSONL files plus `manifest.json`. It is suitable as a row-data preservation backup before dataset replacement, but it is not a binary/schema restore point. Use it only after the same explicit full-row-backup approval.

## 2. Preflight Checks

```powershell
cd backend
pnpm run check
pnpm run build
```

Confirm that `DATABASE_URL` points to the intended Supabase project and that the frontend still goes through the backend API. Do not expose Supabase credentials in browser env vars.

Supabase notes:

- Newly created tables may not be exposed to the Data API automatically.
- This app should use backend API access, not direct browser Supabase reads.
- Keep RLS enabled on `shopping_*` tables even if no public policies are granted.

## 3. Apply Schema

```powershell
cd backend
pnpm run db:migrate
```

Expected new migration:

```text
backend/drizzle/0006_amazon_reviews_2023_catalog.sql
```

## 4. Profile Dataset

```powershell
cd backend
pnpm run dataset:profile:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --sample-lines 50000 --out reports/amazon2023-profile.json
```

Use the profile to confirm field coverage for product title, price, store/brand, details, categories, images, and reviews.

`Amazon_Fashion` often has empty `categories`. The import scripts derive category paths from title/features/details for filter UX while preserving the raw source row in `shopping_products.raw_metadata`.

## 5. Generate Capacity-Aware Seed Plan

```powershell
cd backend
pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json --db-budget-mb 500 --current-db-mb 68 --target-headroom-mb 70 --reviews-per-product 5
```

The plan must:

- exclude configured non-shopping categories,
- include only products with review coverage when reviews are available,
- order products by deterministic category-stratified sampling,
- leave final product count to measured DB size during import.

## 6. Import Under DB Budget

```powershell
cd backend
pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json --safe-target-mb 430 --chunk-products 500 --reviews-per-product 5
```

The importer records DB/table size samples in `shopping_seed_size_samples` and stops at the configured safe DB target.

For plan-backed imports with a reviews file, the importer skips already imported products, preloads review rows for the remaining planned candidates, filters out candidates with no reviews, and imports product metadata plus reviews in the same chunk. This keeps the live service invariant that every imported product is review-backed.

If import is interrupted after product rows but before reviews, attach reviews to the existing dataset products:

```powershell
pnpm run dataset:import:amazon2023 -- --reviews datasets\amazon2023\Amazon_Fashion.jsonl.gz --dataset-slug amazon-fashion-2023 --safe-target-mb 400 --reviews-per-product 5 --reviews-only-existing true
```

If an interrupted import left products without reviews, purge them before QA:

```powershell
pnpm run dataset:purge-no-review:amazon2023 -- --dataset-slug amazon-fashion-2023
```

## 7. Verify DB Quality

```powershell
cd backend
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 430 --min-products 1 --min-reviews 1 --min-images 1 --min-evidence 1
```

Do not continue if products lack raw metadata, image URLs, brand/store, category paths, reviews, or extracted review evidence.

## 8. Image URL Check And Fallback Candidates

```powershell
cd backend
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 1000 --concurrency 8
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 10000 --concurrency 16 --timeout-ms 5000 --primary-only true
pnpm run dataset:fallbacks:amazon2023 -- --dataset-slug amazon-fashion-2023 --out reports/amazon2023-fallback-candidates.json
```

Only broken image rows without `storage_public_url` should become fallback thumbnail candidates.

Create a public file bucket named `amazon2023-fallbacks` before upload:

- public: true
- allowed MIME types: image/jpeg, image/png, image/webp
- max file size: 1 MB

Public buckets make object retrieval public, but upload/update/delete operations are still access-controlled. Keep fallback uploads server-side with `SUPABASE_SERVICE_ROLE_KEY`; never expose it to the frontend.

Prepare resized local thumbnails for candidates under:

```text
backend/reports/amazon2023-fallback-thumbnails/
```

Supported filename lookup:

- `<imageId>.jpg|jpeg|png|webp`
- `<sourceProductId>.jpg|jpeg|png|webp`
- `<productSlug>.jpg|jpeg|png|webp`
- `<productSlug>/<imageId>.jpg|jpeg|png|webp`

Dry-run file matching:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates reports/amazon2023-fallback-candidates.json --thumbnail-dir reports/amazon2023-fallback-thumbnails --dry-run true
```

Upload and update image rows:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates reports/amazon2023-fallback-candidates.json --thumbnail-dir reports/amazon2023-fallback-thumbnails
```

The script updates `shopping_product_images.storage_bucket`, `storage_path`, `storage_public_url`, and sets image status to `mirrored`. Product-level `image_fallback_status` becomes `fallback_stored` when fallback thumbnails are available.

## 9. API And Frontend Validation

Start backend on `127.0.0.1:8002`, then run:

```powershell
cd backend
pnpm run ai:qa:amazon2023
```

If port `8002` is occupied by a stale process, run QA against an in-process server:

```powershell
$env:AMAZON2023_AI_QA_INPROCESS = "true"
pnpm run ai:qa:amazon2023
```

Build the Amazon frontend with:

```powershell
cd frontend/Amazon
pnpm run build
```

Manual browser checks:

- AI query input accepts Korean and English.
- Parsed criteria render above product cards.
- Clarification chips re-query results.
- Product cards show image, price, brand, category, rating, and review grounding.
- `+ Compare` opens the bottom matrix for 2-4 products.
- Matrix remove action updates the selection.
- Basic left filters remain available in category browsing.

## 10. Rollback

After cutover, the frontend always uses Amazon Reviews 2023. If live data was modified destructively, restore from the full row backup created in step 1 or revert the cutover commit.
