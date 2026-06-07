# Backend

Node.js/Express API server for the AImazon Amazon Reviews 2023 Fashion dataset, AI Criteria Lens orchestration, Supabase Postgres access, and study logging.

## Responsibilities

- Own the normalized shopping schema and Drizzle migrations.
- Import and verify Amazon Reviews 2023 Fashion data.
- Store compact semantic product attributes without duplicating raw review text.
- Serve catalog pages, product details, facets, and filters optimized for the frontend.
- Run Gemini-backed natural-language interpretation when an API key is configured.
- Ground AI output against DB-backed filters, taxonomy, semantic attributes, and review evidence.
- Provide comparison matrix and source snippet APIs.
- Record user-study interaction logs.

## Run Locally

```powershell
cd backend
pnpm install
Copy-Item .env.example .env
# Fill DATABASE_URL. Add GEMINI_API_KEY for LLM-backed AI Criteria Lens.
pnpm run db:migrate
pnpm run db:verify:amazon2023
pnpm run dev
```

Open:

- `http://127.0.0.1:8002/health`
- `http://127.0.0.1:8002/api/demos/amazon/products?limit=5`
- `http://127.0.0.1:8002/api/demos/amazon/products/facets`

The Amazon 2023 catalog is mounted at both paths for compatibility:

- `/api/demos/amazon`
- `/api/demos/amazon2023`

The AI Criteria Lens API is also mounted at both paths:

- `/api/ai/amazon`
- `/api/ai/amazon2023`

## Environment Variables

```text
PORT=8002
CORS_ALLOWED_ORIGINS=http://127.0.0.1:8000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require
DATABASE_SSL=true
GEMINI_API_KEY=<optional-for-llm-query-decomposition>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_AMAZON2023_LLM_TIMEOUT_MS=4500
AI_AMAZON2023_LLM=on
```

Never expose `DATABASE_URL`, Supabase service-role keys, or Gemini keys to frontend code.

## Current Database Tables

Defined in `src/db/schema.ts`:

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

## Dataset And Capacity Workflow

Amazon Reviews 2023 Fashion is imported with product rows, image URLs/fallback thumbnails, prices, brands, categories, product attributes, reviews, review evidence, search documents, and compact semantic attributes.

Typical cutover/import flow:

```powershell
cd backend
pnpm run db:backup:supabase -- -IUnderstandFullRowBackup
pnpm run db:migrate
pnpm run dataset:profile:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz>
pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json --db-budget-mb 500
pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json
pnpm run dataset:semantic:schema:amazon2023
pnpm run dataset:semantic:amazon2023 -- --dataset-slug amazon-fashion-2023 --mode apply --max-db-mb 490
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 490
```

`db:verify:amazon` is currently an alias for the Amazon 2023 verifier. Prefer `db:verify:amazon2023` in new docs and scripts.

## Korean Localization

Amazon 2023 Korean display text is stored in `localized_text.ko` JSON on product, review, and review-evidence rows. English source text remains in the normalized columns. Catalog and AI endpoints accept `locale=ko`; when Korean text is missing they fall back to the English source fields.

Use `pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --min-products-with-ko <expected-products> --min-reviews-with-ko <expected-reviews>` to verify localized row coverage.

## API Surface

Catalog:

```text
GET /health
GET /api/demos/amazon/categories
GET /api/demos/amazon/products?query=&category=&subCategory=&priceMin=&priceMax=&ratingMin=&brand=&color=&genderTarget=&style=&season=&material=&occasion=&limit=&cursor=
GET /api/demos/amazon/products/facets?query=&category=&subCategory=&style=&genderTarget=&season=&material=&occasion=
GET /api/demos/amazon/products/:productId
GET /api/demos/amazon/products/batch?ids=
```

AI Criteria Lens:

```text
POST /api/ai/amazon2023/interpret
POST /api/ai/amazon2023/query
POST /api/ai/amazon2023/compare
GET  /api/ai/amazon2023/query/:queryId/items/:productId/evidence
POST /api/ai/amazon2023/refine
```

Study logs:

```text
POST /api/logs
```

## Important Files And Functions

- `src/app.ts`: CORS, JSON middleware, health route, route mounting, error handling.
- `src/server.ts`: local server entry.
- `src/db/client.ts`: Postgres client from `DATABASE_URL`.
- `src/db/schema.ts`: Drizzle table definitions and indexes.
- `src/routes/amazon2023.ts`
  - `parseFilters`: converts query params into repository filters.
  - catalog routes for manifest, categories, products, facets, batch, detail.
- `src/repositories/amazon2023.ts`
  - `buildProductFilters`: SQL filter construction for product, category, price, rating, and semantic filters.
  - `searchAmazon2023Products`: paginated product search.
  - `getAmazon2023Facets`: sidebar/facet counts.
  - `getAmazon2023ProductDetail`: product detail with reviews and evidence.
  - `serializeProductSummary`: UI-facing card payload.
- `src/routes/amazon2023-ai.ts`
  - `callGeminiInterpretation`: direct Gemini REST call for query decomposition.
  - `buildFilters`: rule-level explicit filter extraction used before/after LLM validation.
  - `buildClarifications`: ambiguity options with `criteriaOverrides`.
  - `reviewEvidence`: review/comment evidence extraction.
  - `comparisonValue` and `comparisonEvidenceAvailable`: matrix cell values and snippet availability.
  - routes for `/interpret`, `/query`, `/compare`, `/evidence`, `/refine`.
- `src/routes/logs.ts`: study event ingestion.

Scripts:

- `scripts/import-amazon-2023.ts`: selected Amazon 2023 product/review import.
- `scripts/enrich-amazon-2023-semantics.ts`: semantic product-level enrichment with score/confidence/evidence counts.
- `scripts/apply-amazon-2023-semantic-schema.ts`: semantic table/index migration helper.
- `scripts/verify-amazon-2023-db.ts`: DB size, table counts, coverage, and quality checks.
- `scripts/test-amazon2023-ai-flows.ts`: natural-language AI QA.
- `scripts/test-amazon2023-clarification-counts.ts`: clarification count validation.

## Verification

```powershell
pnpm run check
pnpm run build
pnpm run db:verify:amazon2023
pnpm run ai:qa:amazon2023
pnpm run clarification:qa:amazon2023
```

## API Documentation

- `api-docs/amazon2023-api.md`: current Amazon Reviews 2023 data/API contract.
- `api-docs/amazon-ai-api.md`: AI Criteria Lens endpoints and payloads.
- `api-docs/amazon-demo-api.md`: older Amazon demo reference retained for comparison.
- `deployment/amazon2023-cutover-runbook.md`: backup, import, fallback images, and validation runbook.
