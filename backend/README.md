# Backend

Backend owns the Node.js API server, database schema, Supabase setup, deployment, and API documentation.

## Responsibilities

- Design the database schema as Drizzle schema and SQL migrations.
- Build and configure Supabase Postgres.
- Manage migrations and seed data imports.
- Define APIs used by frontend and AI modules.
- Deploy backend services.
- Write and maintain API documentation.
- Provide stable mock/staging data for frontend and AI integration.

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
npm install
Copy-Item .env.example .env
# Set DATABASE_URL in .env first.
npm run db:migrate
npm run db:seed:netflix
npm run db:seed:amazon
npm run db:verify:amazon
npm run dev
```

Open:

- `http://127.0.0.1:8002/api/demos/netflix/home`
- `http://127.0.0.1:8002/api/demos/netflix/items?tag=action`
- `http://127.0.0.1:8002/api/demos/amazon/home`
- `http://127.0.0.1:8002/api/demos/amazon/products?limit=5`
- `http://127.0.0.1:8002/api/demos/amazon/products/facets?attribute.warmthLevelMin=4`

`DATABASE_URL` is required because the backend targets Supabase Postgres directly.

Keep this process running while the Netflix frontend is open. Local runtime logs appear in the terminal running `npm run dev`; deployed runtime logs will come from the Node host. Supabase logs show database-side activity, not the browser-to-backend request URL.

## Current Supabase Status

The current local backend has been verified against the Supabase project configured in `backend/.env`.

Verified commands:

```powershell
npm run db:migrate
npm run db:seed:netflix
npm run db:seed:amazon
npm run dev
```

Verified results:

- `drizzle/0000_initial.sql` was applied successfully.
- `drizzle/0001_amazon_catalog.sql` was applied successfully.
- `drizzle/0002_amazon_range_indexes.sql` was applied successfully.
- `drizzle/0003_amazon_ai_attributes.sql` was applied successfully.
- `drizzle/0004_amazon_review_intelligence.sql` was applied successfully.
- `drizzle/0005_amazon_review_metadata.sql` was applied successfully.
- Netflix seed import completed with 30 media items, 3 tags, and 5 shelves.
- Amazon seed import completed with the v3 AI-ready fixture: 420 products, 7 categories, 40 subcategories, 11,335 reviews, 11,335 review profiles, 28 AI attributes, and 58,371 evidence rows.
- `npm run db:verify:amazon` confirmed product/review/evidence counts, 5-79 reviews per product, 2-8 evidence rows per review, median product rating 4.2, 273 products rated 4.0+, 26 positive-only products, 34 high-rating low-review products, 186 high-rating products with complaint evidence, complete `primary`/`description`/`brand` image URL coverage for all 420 products, clustered and diverse negative issue patterns, 0 duplicate review bodies, 0 evidence-text mismatches, and 0 category-context mismatches.
- `GET /health` returned `{ "ok": true }`.
- `GET /api/demos/netflix/home` returned Supabase-backed Netflix home data.
- `GET /api/demos/amazon/home` returned Supabase-backed Amazon category data.

Do not commit `backend/.env`. It contains the Supabase Postgres connection string and DB password.

If the direct Supabase host `db.<project-ref>.supabase.co` fails from a local network, use the Supabase Session Pooler URI instead. Direct connection can require IPv6 network support.

## Frontend Integration Info

Frontend only needs the backend base URL, not Supabase credentials.

Local backend base URL:

```text
http://127.0.0.1:8002
```

Netflix frontend env:

```text
VITE_NETFLIX_API_BASE_URL=http://127.0.0.1:8002
```

Primary endpoints:

```text
GET  /api/demos/netflix/home
GET  /api/demos/netflix/shelves
GET  /api/demos/netflix/items?query=&tag=&limit=&offset=
GET  /api/demos/netflix/items/:itemId
GET  /api/demos/amazon/home
GET  /api/demos/amazon/categories
GET  /api/demos/amazon/products?query=&category=&subCategory=&priceMax=&attribute.warmthLevelMin=&attribute.waterproof=&limit=&cursor=
GET  /api/demos/amazon/products/facets?query=&category=&attribute.material=
GET  /api/demos/amazon/products/:productId
POST /api/logs
```

Amazon facets now include `reviewIntelligence` summaries for negative issue types, affected attributes, and reviewer profile distributions. Product detail reviews include a `profile` object plus optional review metadata (`helpfulVotes`, `verifiedPurchase`, `reviewSource`, `reviewImagesCount`), and `reviewEvidence` includes `issueType`, `severity`, and a typed `evidenceValue`.

Never share these with frontend code:

- `DATABASE_URL`
- DB password
- Supabase service-role key
- Supabase project password

Frontend verification:

1. Start this backend on port `8002`.
2. Start `frontend/Netflix`.
3. Open browser DevTools Network tab.
4. Confirm the frontend requests `http://127.0.0.1:8002/api/demos/netflix/home`.

## Node App Layout

- `src/app.ts`: Express app, CORS, JSON middleware, route mounting, and error handling.
- `src/server.ts`: local/dev server entry point.
- `src/db/schema.ts`: Drizzle table definitions with composite primary keys for join tables.
- `src/db/client.ts`: Supabase Postgres connection through `pg`.
- `src/routes/`: HTTP routes documented in `api-docs/netflix-demo-api.md`.
- `src/repositories/`: query and serialization logic.
- `src/scripts/migrate.ts`: applies all SQL files in `drizzle/` in filename order.
- `src/scripts/seed-netflix.ts`: imports `frontend/Netflix/data.json` into normalized tables.
- `src/scripts/seed-amazon.ts`: imports active Amazon batch files from `fixtures/amazon-human/seed/`; historical direct-authored and `src_op` batches live under `fixtures/amazon-human/archive/` and are not loaded.
- `scripts/build_amazon_v3_batches.py`: builds the deterministic v3 synthetic Amazon fixture with uneven product popularity, market patterns, positive-only products, targeted fit/use complaints, category-specific issue clusters, review metadata, and broader fit/body profile coverage.
- `scripts/validate_amazon_human_batches.py`: validates Amazon batch references, v3 counts, review/evidence distribution, profile coverage, positive-only/high-rating complaint cases, issue clustering/diversity, repeated text limits, context mismatches, and evidence text grounding.
- `scripts/verify-amazon-v3-db.ts`: checks the live Supabase Amazon import.
- `scripts/build_src_op_amazon_batches.py`: normalizes reviewed `frontend/Amazon/src_op` products into archived backend reference batches.
- `fixtures/amazon-human/`: backend source of truth for the Amazon AI-ready seed dataset, archive notes, and progress log.
- `drizzle/0000_initial.sql`: reproducible SQL schema migration.
- `drizzle/0001_amazon_catalog.sql`: Amazon product catalog and review schema migration.
- `drizzle/0002_amazon_range_indexes.sql`: Amazon range filter indexes.
- `drizzle/0003_amazon_ai_attributes.sql`: Amazon AI attribute taxonomy/value/evidence schema.
- `drizzle/0004_amazon_review_intelligence.sql`: Amazon review profile and issue evidence schema.
- `drizzle/0005_amazon_review_metadata.sql`: Amazon review metadata columns and expanded issue vocabulary.

## `supabase/`

Put Supabase setup notes and optional project files here:

- migrations
- seed data
- edge functions, if used
- local Supabase config
- schema notes

Optional future structure:

```text
backend/supabase/
|-- migrations/
|-- seed/
`-- functions/
```

## `api-docs/`

Put backend API documents here:

- endpoint list
- request/response examples
- error codes
- auth requirements
- frontend/backend data contracts

Current API document:

- `api-docs/amazon-demo-api.md`: Amazon page-data API, normalized catalog/review schema, Mermaid ER diagram, recommended indexes, response models, and error model.
- `api-docs/netflix-demo-api.md`: Netflix page-data API, 4NF schema, Mermaid ER diagram, recommended indexes, response models, and error model.

## `deployment/`

Put deployment instructions here:

- Supabase project setup
- environment variables
- deploy commands
- deployment checklist
- rollback notes

## Core Data Entities

Initial schema covers:

- demo sites
- shopping product categories
- shopping products
- product assets
- product features
- product options
- product rating breakdowns
- product reviews
- product review profiles
- product review evidence and issue summaries
- media items
- media tags
- media assets
- media episodes
- media shelves
- media hero placements
- interaction logs

AI task tables should be added after the AI request/display contracts are finalized.

## Integration Rule

Backend should expose data in a shape that is easy for:

- frontend UI rendering
- future AI integration

If the API changes, update `docs/IMPLEMENTATION.md` and `backend/api-docs/`.
