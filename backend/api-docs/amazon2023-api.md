# Amazon Reviews 2023 Shopping API

## Base Paths

```text
/api/demos/amazon2023
/api/ai/amazon2023
```

This API is the active contract for the Amazon shopping demo after moving from the synthetic seed to Amazon Reviews 2023 fashion data. `/api/demos/amazon` and `/api/ai/amazon` are compatibility aliases for these same handlers.

The schema preserves every original field for selected products and reviews:

- selected product metadata is stored in `shopping_products.raw_metadata`
- selected review rows are stored in `shopping_reviews.raw_review`
- review-grounded AI snippets are stored in `shopping_review_evidence`
- image binaries are not stored in Postgres
- all source image URLs are stored in `shopping_product_images`
- only broken source image URLs become Supabase Storage fallback thumbnail candidates

When Amazon Reviews 2023 `categories` is empty, the import pipeline derives a display/filter category path from product text and details. The original row is still stored unchanged in `shopping_products.raw_metadata`.

## Dataset Gate

The API returns `DATASET_NOT_FOUND` until:

1. `backend/drizzle/0006_amazon_reviews_2023_catalog.sql` has been applied.
2. `shopping_datasets` contains an active `amazon-fashion-2023` dataset.
3. `shopping_products`, `shopping_product_images`, and `shopping_reviews` have imported rows.

Verify with:

```powershell
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 480 --min-evidence 1
```

Before importing, generate a capacity-aware seed plan. The plan scans reviews first and orders only review-backed products with deterministic category-stratified sampling:

```powershell
pnpm run dataset:plan:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --out backend/reports/amazon2023-seed-plan.json --db-budget-mb 500 --current-db-mb 68 --target-headroom-mb 70 --reviews-per-product 5
```

## Catalog Endpoints

### `GET /api/demos/amazon2023/manifest`

Returns dataset metadata and row counts.

Example response:

```json
{
  "dataset": {
    "slug": "amazon-fashion-2023",
    "sourceName": "Amazon Reviews 2023",
    "sourceCategory": "Amazon_Fashion",
    "subsetStrategy": "capacity_stratified_sampling",
    "dbBudgetBytes": 450887680,
    "storageStrategy": "external_url_with_selective_fallback",
    "isActive": true
  },
  "counts": {
    "products": 20000,
    "reviews": 100000,
    "images": 42000
  }
}
```

### `GET /api/demos/amazon2023/categories`

Returns frontend-ready navigation taxonomy plus the full imported taxonomy.

Optional query:

```text
?dataset=amazon-fashion-2023
```

Response:

```json
{
  "dataset": "amazon-fashion-2023",
  "categories": [
    {
      "key": "amazon-fashion-women",
      "displayName": "Women",
      "filterSlug": "amazon-fashion-women",
      "depth": 1,
      "parentKey": "amazon-fashion",
      "productCount": 1332,
      "representativeImageUrl": "https://..."
    }
  ],
  "navigation": [
    {
      "key": "amazon-fashion-women-shoes-sneakers",
      "displayName": "Sneakers",
      "filterSlug": "amazon-fashion-women-shoes-sneakers",
      "depth": 3,
      "parentKey": "amazon-fashion-women-shoes",
      "productCount": 120
    }
  ],
  "taxonomy": ["same shape as navigation"]
}
```

### `GET /api/demos/amazon2023/products`

Returns product cards for shopping/search UI.

Query parameters:

| Name | Type | Description |
| --- | --- | --- |
| `dataset` | string | Optional dataset slug. Defaults to active dataset. |
| `query` | string | Search over title, description, brand/store, category, attributes, and review text. |
| `category` | string | Category slug, source path, or category label. |
| `subCategory` | string | Category slug, source path, or label for a child category. |
| `color` | string | Color family label such as `Black`, `Tan`, or `Blue`. |
| `brand` | string | Brand/store filter. |
| `priceMin` / `priceMax` | number | Price range. |
| `ratingMin` / `ratingMax` | number | Rating range. |
| `sort` | enum | `title_asc`, `price_asc`, `price_desc`, `rating_desc`, `review_count_desc`. |
| `view` | enum | `card` returns compact card fields. `detail` includes `details` and fuller feature text. Default `card`. |
| `limit` | integer | Default 24, max 200. |
| `offset` | integer | Offset pagination. |

Response item shape:

```json
{
  "id": "uuid",
  "sourceProductId": "B000000",
  "parentAsin": "B000000",
  "asin": "B000000",
  "slug": "cotton-dress-b000000",
  "title": "Cotton Dress",
  "name": "Cotton Dress",
  "brand": "Example Store",
  "store": "Example Store",
  "price": 29.99,
  "currencyCode": "USD",
  "rating": 4.4,
  "reviewCount": 120,
  "category": "Women",
  "subCategory": "Dresses",
  "mainCategory": "AMAZON FASHION",
  "categoryPath": ["AMAZON FASHION", "Women", "Dresses"],
  "imageUrl": "https://...",
  "imageFallbackStatus": "source_ok",
  "colors": ["Blue"],
  "sizes": ["Medium"],
  "features": ["..."]
}
```

### `GET /api/demos/amazon2023/products/facets`

Returns facet ranges and top brands, subcategories, and colors for the current candidate set.

Use this endpoint before AI ambiguity resolution so suggested chips come from actual imported data.

```json
{
  "total": 1332,
  "ranges": {
    "price": { "min": 5.99, "max": 149.99, "currencyCode": "USD" },
    "rating": { "min": 1, "max": 5 }
  },
  "brands": [{ "value": "Example Store", "label": "Example Store", "count": 24 }],
  "subCategories": [{ "value": "amazon-fashion-women-shoes", "label": "Shoes", "count": 218 }],
  "colors": [{ "value": "Black", "label": "Black", "count": 83 }]
}
```

### `POST /api/demos/amazon2023/products/batch`

Returns full details for 1-20 internal product ids in one request. The comparison matrix uses the same repository path to avoid per-product detail query fan-out.

```json
{
  "productIds": ["uuid-1", "uuid-2"]
}
```

### `GET /api/demos/amazon2023/products/:productId`

Returns full product detail:

- summary fields
- all imported source images
- extracted attributes from `details`
- category path rows
- first 25 reviews
- `rawMetadata`
- review `rawReview`
- review `evidence[]`
- product-level `reviewEvidence[]`

`productId` can be internal UUID, slug, or source product id.

## AI Criteria Lens Endpoints

### `POST /api/ai/amazon2023/interpret`

Parses natural language into dataset-backed criteria and clarification chips.

Request:

```json
{
  "query": "comfortable office bag under $80",
  "visibleContext": {
    "page": "products"
  },
  "session": {
    "sessionId": "local",
    "locale": "en"
  }
}
```

Response includes:

- `queryId`
- `parsedCriteria`
- `clarifications`
- `comparisonDimensions`
- `estimatedTotal`

### `POST /api/ai/amazon2023/query`

Returns AI Criteria Lens product cards.

Request:

```json
{
  "queryId": "amazon2023_x",
  "query": "comfortable office bag under $80",
  "criteriaOverrides": [
    {
      "key": "brand",
      "value": "Example Store"
    }
  ]
}
```

Response includes:

- validated criteria
- comparison dimensions
- `items[]` with `decisionEvidence`
- pagination totals

### `GET /api/ai/amazon2023/query/:queryId/items/:productId/evidence`

Returns review-derived snippets for one product. This endpoint reads imported `shopping_reviews` and does not invent review claims.

When `shopping_review_evidence` rows exist, the endpoint returns those stored rows first. If a product has reviews but no extracted rows, it falls back to raw review text heuristics.

### `POST /api/ai/amazon2023/compare`

Builds a 2-4 product comparison matrix.

Supported dimensions include product facts, source details, and review-backed evidence signals:

- `price`
- `brand`
- `rating`
- `reviewCount`
- `subCategory`
- `colorFamily`
- `color`
- `size`
- `material`
- `occasion`
- `style`
- `season`
- `genderTarget`
- `capacityLiters`
- `pocketUtilityLevel`
- `strapComfortLevel`
- `waterproof`
- `weightGrams`
- `warmthLevel`
- `shoulderStructure`
- `careComplexityLevel`
- `lengthFit`
- `comfortLevel`
- `durabilityLevel`
- `breathabilityLevel`
- `stretchLevel`
- `softnessLevel`
- `machineWashable`
- `waistRise`
- `toeBoxFit`
- `archSupportLevel`
- `soleGripLevel`
- `opacityLevel`
- `fit`
- `reviewStrengths`
- `reviewRisks`

The compare endpoint fetches selected product details through the batch detail repository path to avoid both Supabase Free session pool exhaustion and per-product query fan-out. The frontend still limits active visible dimensions so the matrix remains usable.

### `POST /api/ai/amazon2023/refine`

Applies a refine command or selected criteria override to the current `queryId`.

## Image Fallback Flow

Initial import stores source URLs only.

1. Import metadata into `shopping_product_images`.
2. Check URLs:

   ```powershell
   pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 1000 --concurrency 8
   ```

3. Export broken-only fallback candidates:

   ```powershell
   pnpm run dataset:fallbacks:amazon2023 -- --dataset-slug amazon-fashion-2023 --out backend/reports/amazon2023-fallback-candidates.json
   ```

4. Mirror only those candidates to Supabase Storage as resized thumbnails.
5. Update `shopping_product_images.storage_bucket`, `storage_path`, and `storage_public_url`.
6. Product APIs prefer `storage_public_url`, then fall back to original `source_url`.

Create the `amazon2023-fallbacks` bucket as a public file bucket with image-only upload restrictions. Keep uploads server-side only with `SUPABASE_SERVICE_ROLE_KEY`; never expose that key to the frontend.

Upload prepared fallback thumbnails:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates backend/reports/amazon2023-fallback-candidates.json --thumbnail-dir backend/reports/amazon2023-fallback-thumbnails
```

Dry-run local file matching first:

```powershell
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates backend/reports/amazon2023-fallback-candidates.json --thumbnail-dir backend/reports/amazon2023-fallback-thumbnails --dry-run true
```

## Validation Commands

```powershell
pnpm run dataset:profile:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --sample-lines 50000 --out backend/reports/amazon2023-profile.json
pnpm run dataset:plan:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --out backend/reports/amazon2023-seed-plan.json --db-budget-mb 500 --current-db-mb 68 --target-headroom-mb 70 --reviews-per-product 5
pnpm run dataset:import:amazon2023 -- --metadata <meta.jsonl.gz> --reviews <reviews.jsonl.gz> --selection-plan backend/reports/amazon2023-seed-plan.json --safe-target-mb 430 --chunk-products 500 --reviews-per-product 5
pnpm run dataset:import:amazon2023 -- --reviews <reviews.jsonl.gz> --dataset-slug amazon-fashion-2023 --safe-target-mb 400 --reviews-per-product 5 --reviews-only-existing true
pnpm run dataset:purge-no-review:amazon2023 -- --dataset-slug amazon-fashion-2023
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 1000 --concurrency 8
pnpm run dataset:images:amazon2023 -- --dataset-slug amazon-fashion-2023 --limit 10000 --concurrency 16 --timeout-ms 5000 --primary-only true
pnpm run dataset:fallbacks:amazon2023 -- --dataset-slug amazon-fashion-2023
pnpm run dataset:upload-fallbacks:amazon2023 -- --candidates reports/amazon2023-fallback-candidates.json --thumbnail-dir reports/amazon2023-fallback-thumbnails --dry-run true
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 480 --min-evidence 1
pnpm run ai:qa:amazon2023
$env:AMAZON2023_AI_QA_INPROCESS = "true"; pnpm run ai:qa:amazon2023
```
