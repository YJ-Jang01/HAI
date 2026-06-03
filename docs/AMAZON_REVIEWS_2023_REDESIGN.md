# Amazon Reviews 2023 Redesign

## Goal

Replace the current synthetic Amazon seed with a capacity-bounded Amazon Reviews 2023 fashion seed while preserving every original field for selected products and reviews.

The first constraint is Supabase Free:

- Database: 500 MB hard quota.
- Practical target: 400-430 MB to avoid read-only lockout.
- Storage: 1 GB, reserved only for broken-image fallback thumbnails.

## Dataset Scope

Use Amazon Reviews 2023 `Amazon_Fashion` first. `Clothing_Shoes_and_Jewelry` is too large for Free-tier import and should only be used later for category expansion or Pro-tier experiments.

Selected products must preserve original metadata:

- `title`
- `price`
- `store` and brand-like values from `details`
- `average_rating`
- `rating_number`
- `features`
- `description`
- `details`
- `images`
- `categories`
- full raw metadata JSON

Selected reviews must preserve original review fields:

- `rating`
- `title`
- `text`
- `parent_asin` or `asin`
- `user_id` or hashed reviewer id
- `timestamp`
- `helpful_vote`
- `verified_purchase`
- full raw review JSON

Review-backed AI evidence is extracted during import into `shopping_review_evidence`. The extractor is intentionally conservative and grounded in saved review text:

- every imported review keeps `raw_review`
- keyword/rating rules emit 1-6 evidence rows per review
- evidence rows keep `review_id`, `attribute_key`, `sentiment`, `issue_type`, `confidence`, and source text
- the product detail and AI evidence APIs prefer stored `shopping_review_evidence` rows, then fall back to raw review text if no extracted rows exist

`Amazon_Fashion` keeps `categories` empty for many products. For those rows, the import tooling derives a shopping-friendly category path from title, features, description, and details while preserving the original empty `categories` array in `raw_metadata`. The derived path uses this shape:

```text
Amazon Fashion > Department > Product Group > Leaf Category
```

Examples include `Amazon Fashion > Women > Clothing > Dresses`, `Amazon Fashion > Men > Accessories > Hats & Caps`, and `Amazon Fashion > Unisex > Shoes > Sneakers`.

## Capacity Strategy

Do not choose a product count first. Import size is chosen from measured storage use.

1. Profile local `.jsonl.gz` files with:

   ```powershell
   pnpm run dataset:profile:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --sample-lines 50000 --out backend/reports/amazon2023-profile.json
   ```

2. Use the profile to estimate raw metadata/review bytes, category distribution, image count distribution, field coverage, and product eligibility.
3. Generate a deterministic seed plan from DB capacity, not from a fixed product target.
4. Run pilot imports in chunks using the seed plan order.
5. After each chunk, record `pg_database_size` and table sizes into `shopping_seed_size_samples`.
6. Stop importing before the safe DB target, currently 400-430 MB.

Importer command:

```powershell
pnpm run dataset:import:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --safe-target-mb 430 --chunk-products 500 --reviews-per-product 5
```

Dry-run command:

```powershell
pnpm run dataset:import:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --max-products 1000 --dry-run true
```

Seed plan command:

```powershell
pnpm run dataset:plan:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --out backend/reports/amazon2023-seed-plan.json --db-budget-mb 500 --current-db-mb 68 --target-headroom-mb 70 --reviews-per-product 5
```

Plan-backed importer command:

```powershell
pnpm run dataset:import:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --selection-plan backend/reports/amazon2023-seed-plan.json --safe-target-mb 400 --chunk-products 500 --reviews-per-product 5
```

When `--selection-plan` and `--reviews` are both provided, the importer now skips products already present in `shopping_products`, preloads matching review rows for the remaining planned candidates, filters out candidates with no review rows, and imports product metadata plus reviews in the same chunk. This avoids product-only rows and keeps the service invariant that every imported product has at least one review.

If product import is interrupted before reviews are attached, use the existing-product review pass:

```powershell
pnpm run dataset:import:amazon2023 -- --reviews <reviews.jsonl.gz> --dataset-slug amazon-fashion-2023 --safe-target-mb 400 --reviews-per-product 5 --reviews-only-existing true
```

If a previous interrupted import left products without reviews, remove them before QA:

```powershell
pnpm run dataset:purge-no-review:amazon2023 -- --dataset-slug amazon-fashion-2023
```

Sampling strategy:

- Reclassify source categories into shopping-friendly fashion categories.
- Exclude only categories that do not fit the fashion shopping experience.
- Fill the remaining seed with capacity-aware stratified sampling by category.
- Require review-backed products by default when a reviews file is available, so product cards, comparison evidence, and AI Criteria Lens flows do not land on products with no review grounding.
- Use `dataset:plan:amazon2023` to produce a deterministic category-stratified product order. The importer still uses measured `pg_database_size`, not the plan's estimated product count, as the final stop condition.
- Keep all original fields for selected rows.

## Image Strategy

Image binaries are not stored in Postgres.

Initial Free-tier behavior:

- Store all original image URLs in `shopping_product_images`.
- API returns `storage_public_url` when present, otherwise `source_url`.
- URL checks mark image status as `ok`, `broken`, `unchecked`, `mirrored`, or `failed`.

Fallback behavior:

- Only products with broken original URLs become candidates for Supabase Storage fallback.
- Store only resized thumbnails in Storage.
- Store the Storage bucket/path/public URL in `shopping_product_images`.
- Keep original image URLs even after mirroring.
- Product-level `image_fallback_status` becomes `fallback_stored` when a fallback thumbnail is available and no source image is usable.

Image URL check command:

```powershell
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 1000 --concurrency 8
```

For product-card readiness, check primary images first:

```powershell
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 10000 --concurrency 16 --timeout-ms 5000 --primary-only true
```

The checker marks image rows as `ok` or `broken` and updates product-level `image_fallback_status` to `source_ok`, `fallback_stored`, `fallback_candidate`, or `unchecked`.

Export broken-only fallback candidates:

```powershell
pnpm run dataset:fallbacks:amazon2023 -- --dataset-slug amazon-fashion-2023 --out backend/reports/amazon2023-fallback-candidates.json
```

After preparing local thumbnails for those candidates, verify local file matching:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates backend/reports/amazon2023-fallback-candidates.json --thumbnail-dir backend/reports/amazon2023-fallback-thumbnails --dry-run true
```

Then upload server-side with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` set:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates backend/reports/amazon2023-fallback-candidates.json --thumbnail-dir backend/reports/amazon2023-fallback-thumbnails
```

The upload script updates only rows that are still `status = 'broken'` and do not already have `storage_public_url`.

## Verification

After import, verify DB quality and Free-tier size:

```powershell
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 430 --min-products 1 --min-reviews 1 --min-images 1 --min-evidence 1
```

The verifier checks:

- active dataset exists
- DB size stays below the configured safety target
- products, reviews, and images exist
- selected products retain `raw_metadata`
- selected reviews retain `raw_review`
- products have title, price, brand/store, category path, and image URLs
- reviews have valid rating/body/product links
- extracted review evidence exists
- image URLs are HTTP(S)
- every product has at least one primary image and at least one review

After starting the backend server, verify the Amazon 2023 AI Criteria Lens API:

```powershell
pnpm run ai:qa:amazon2023
```

If the normal dev server cannot be restarted, run the same QA against an in-process Express server:

```powershell
$env:AMAZON2023_AI_QA_INPROCESS = "true"
pnpm run ai:qa:amazon2023
```

The API QA covers:

- `GET /api/demos/amazon2023/manifest`
- `POST /api/ai/amazon2023/interpret`
- `POST /api/ai/amazon2023/query`
- `GET /api/ai/amazon2023/query/:queryId/items/:productId/evidence`
- `POST /api/ai/amazon2023/compare`

## New Schema

Migration: `backend/drizzle/0006_amazon_reviews_2023_catalog.sql`

Primary tables:

- `shopping_datasets`
- `shopping_categories`
- `shopping_products`
- `shopping_product_category_paths`
- `shopping_product_images`
- `shopping_product_attributes`
- `shopping_reviews`
- `shopping_review_evidence`
- `shopping_import_runs`
- `shopping_seed_size_samples`

The current synthetic catalog tables remain intact until a full data backup is approved and completed.

## Backend API

New read API prefix:

- `GET /api/demos/amazon2023/manifest`
- `GET /api/demos/amazon2023/categories`
- `GET /api/demos/amazon2023/products`
- `GET /api/demos/amazon2023/products/facets`
- `GET /api/demos/amazon2023/products/:productId`

`/api/demos/amazon` is now a compatibility alias for the Amazon Reviews 2023 API.

New AI API prefix:

- `POST /api/ai/amazon2023/interpret`
- `POST /api/ai/amazon2023/query`
- `GET /api/ai/amazon2023/query/:queryId/items/:productId/evidence`
- `POST /api/ai/amazon2023/compare`
- `POST /api/ai/amazon2023/refine`

## Frontend Cutover

The Amazon frontend always uses the Amazon Reviews 2023 API. `VITE_AMAZON_CATALOG_KIND` is no longer used.

## AI Criteria Lens Redesign

The AI layer should move from synthetic fixed attributes to dataset-backed attributes:

- Query decomposition uses `title`, `features`, `description`, `details`, `categories`, and review text.
- Ambiguity options come from actual facet distributions and repeated review language.
- Comparison dimensions are selected from available product details and evidence density.
- Evidence snippets are extracted from `shopping_reviews.body` into `shopping_review_evidence`.
- Product detail and AI evidence endpoints read `shopping_review_evidence` first, with raw review text fallback.
- The `/interpret` flow should pre-search with non-ambiguous filters while ambiguity chips are displayed.

Initial AI-ready dimensions:

- price
- brand/store
- category
- rating
- review count
- color
- size
- material/fabric
- occasion
- style
- season
- gender target
- capacity
- pocket utility
- strap comfort
- water resistance
- weight
- warmth
- shoulder structure
- care complexity
- length fit
- breathability
- stretch
- softness
- machine washable
- waist rise
- toe-box fit
- arch support
- sole grip
- opacity
- fit
- comfort
- durability
- care/wash
- review risks
- review strengths

## Backup State

The full approved row-data backup for the existing public Supabase schema was written locally as JSONL under `backend/backups/`. This is not a binary `pg_dump` restore point, but it preserves every public table row from the configured project before Amazon 2023 replacement work.

The local `pg_dump` was PostgreSQL 15.4 while the Supabase server is PostgreSQL 17.6, so the runbook uses JSONL row backup unless a compatible `pg_dump` 17.x client is installed.

## Current Live Seed Snapshot

Current live Amazon 2023 import status:

- dataset slug: `amazon-fashion-2023`
- DB size after verification: 420 MB
- products: 6,161
- reviews: 15,064
- images: 77,865
- extracted evidence rows: 17,261
- review coverage: every imported product has at least one review
- checked primary image URLs: all unchecked primary images checked ok, 0 broken
- fallback candidates after primary image check: 0

## Cutover Gate

Do not replace or delete the existing synthetic Supabase data until all gates pass:

1. Full row-data backup has been created and restore metadata verified.
2. `0006_amazon_reviews_2023_catalog.sql` has been applied.
3. `dataset:profile:amazon2023` report exists for the selected source files.
4. `dataset:plan:amazon2023` has produced a review-backed, category-stratified plan.
5. `dataset:import:amazon2023` finished under the safe DB target using `--selection-plan`.
6. `db:verify:amazon2023` passes with review evidence present.
7. `dataset:images:amazon2023` has marked broken images and fallback candidates.
8. Broken-only fallback thumbnails have been mirrored to Supabase Storage where needed.
9. `ai:qa:amazon2023` passes against a running backend.
10. Amazon frontend builds and E2E passes without a catalog-kind feature flag.
