# Backend

Backend owns the Node.js API server, Amazon Reviews 2023 database schema, Supabase setup, deployment, and API documentation.

## Responsibilities

- Design the shopping database schema as Drizzle schema and SQL migrations.
- Build and configure Supabase Postgres.
- Manage migrations, import scripts, semantic enrichment, and verification.
- Define APIs used by frontend and AI modules.
- Deploy backend services.
- Write and maintain API documentation.
- Provide stable staging data for frontend and AI integration.

## Directory Layout

```text
backend/
|-- README.md
|-- .env.example
|-- package.json
|-- tsconfig.json
|-- fixtures/
|-- scripts/
|-- src/
|-- drizzle/
|-- supabase/
|-- deployment/
`-- api-docs/
```

## Local Setup

```powershell
cd backend
pnpm install
Copy-Item .env.example .env
# Set DATABASE_URL in .env first.
pnpm run db:migrate
pnpm run dataset:semantic:schema:amazon2023
pnpm run db:verify:amazon2023
pnpm run dev
```

Open:

- `http://127.0.0.1:8002/health`
- `http://127.0.0.1:8002/api/demos/amazon/categories`
- `http://127.0.0.1:8002/api/demos/amazon/products?limit=5`
- `http://127.0.0.1:8002/api/demos/amazon/products/facets`
- `http://127.0.0.1:8002/api/ai/amazon2023/query`

`DATABASE_URL` is required because the backend targets Supabase Postgres directly.

## Amazon Reviews 2023 Flow

Amazon Reviews 2023 Fashion is the current shopping dataset target.

```powershell
cd backend
pnpm run db:backup:supabase -- -IUnderstandFullRowBackup
pnpm run db:migrate
pnpm run dataset:profile:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz>
pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json --db-budget-mb 500 --current-db-mb <current-size> --target-headroom-mb 70 --reviews-per-product 5
pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json --safe-target-mb 430 --reviews-per-product 5
pnpm run dataset:semantic:schema:amazon2023
pnpm run dataset:semantic:amazon2023 -- --dataset-slug amazon-fashion-2023 --mode apply --max-db-mb 490
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 490 --min-products 1 --min-reviews 1 --min-images 1 --min-evidence 1 --min-semantic 1
```

Run the backup command only after explicit approval to copy all current Supabase row data into a local file. It requires `pg_dump` and `pg_restore` 17.x or newer. Full cutover details are in `deployment/amazon2023-cutover-runbook.md`.

## AI Criteria Lens

Gemini powers natural-language query decomposition when quota is available. Backend validates and grounds all returned filters against dataset-backed taxonomy, product fields, semantic attributes, and review evidence. If Gemini is unavailable, log the failure and avoid treating temporary fallback behavior as the target AI quality.

Useful QA commands:

```powershell
pnpm run check
pnpm run build
pnpm run db:verify:amazon2023
pnpm run ai:qa:amazon2023
```

## Frontend Integration Info

Frontend only needs the backend base URL, not Supabase credentials.

Local backend base URL:

```text
http://127.0.0.1:8002
```

Primary endpoints:

```text
GET  /health
GET  /api/demos/amazon/categories
GET  /api/demos/amazon/products?query=&category=&subCategory=&priceMin=&priceMax=&ratingMin=&brand=&genderTarget=&style=&season=&material=&limit=&cursor=
GET  /api/demos/amazon/products/facets?query=&category=&style=&genderTarget=
GET  /api/demos/amazon/products/:productId
POST /api/ai/amazon2023/query
POST /api/ai/amazon2023/compare
GET  /api/ai/amazon2023/query/:queryId/items/:productId/evidence
POST /api/logs
```

Never share these with frontend code:

- `DATABASE_URL`
- DB password
- Supabase service-role key
- Supabase project password

## Node App Layout

- `src/app.ts`: Express app, CORS, JSON middleware, route mounting, and error handling.
- `src/server.ts`: local/dev server entry point.
- `src/db/schema.ts`: Drizzle table definitions.
- `src/db/client.ts`: Supabase Postgres connection through `pg`.
- `src/routes/amazon2023.ts`: Amazon catalog endpoints.
- `src/routes/amazon2023-ai.ts`: AI Criteria Lens endpoints.
- `src/routes/logs.ts`: study interaction logging.
- `src/repositories/amazon2023.ts`: Amazon 2023 query and serialization logic.
- `scripts/import-amazon-2023.ts`: Amazon Reviews 2023 import.
- `scripts/enrich-amazon-2023-semantics.ts`: compact semantic attribute enrichment.
- `scripts/verify-amazon-2023-db.ts`: live Supabase verification.

## Current API Documents

- `api-docs/amazon-demo-api.md`
- `api-docs/amazon-ai-api.md`
- `api-docs/amazon2023-api.md`

## Integration Rule

Backend should expose data in a shape that is easy for frontend UI rendering and future AI integration. If the API changes, update `docs/IMPLEMENTATION.md` and `backend/api-docs/`.
