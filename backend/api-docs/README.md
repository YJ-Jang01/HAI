# API Docs

This directory stores backend API documentation.

## What Belongs Here

- Endpoint specifications.
- Database schema used by the endpoints.
- Mermaid schema diagrams when useful.
- Recommended indexes for endpoint lookup/filter/order paths.
- Request and response schemas.
- Example payloads.
- Error codes.
- Auth notes.
- Frontend/backend data contracts.

## Current API Scope

Current API docs should focus on:

- page rendering data
- detail view data
- search/filter data
- study interaction logging
- AI Criteria Lens orchestration contracts
- DB schema and indexes needed by those APIs

AI-agent-specific APIs are documented separately from page-data APIs so the regular catalog endpoints remain stable.

## API Docs

- `amazon-demo-api.md`: Amazon shopping demo schema and endpoint specification.
- `amazon-ai-api.md`: Amazon AI Criteria Lens query, evidence, compare, and refine endpoint specification.
- `amazon2023-api.md`: Amazon Reviews 2023 replacement-track catalog, AI, import, image fallback, and verification contract.

## Current Implementation

- Node.js/Express routes live in `backend/src/routes/`.
- Drizzle schema lives in `backend/src/db/schema.ts`.
- `pnpm run db:migrate` applies all SQL files in `backend/drizzle/` to Supabase Postgres.
- `pnpm run db:seed:amazon` imports the current Amazon AI-ready batch fixture from `backend/fixtures/amazon-human/seed/`, including review metadata, review profiles, attribute taxonomy, and issue-tagged evidence. If v4 expansion batches exist, the importer loads the v3 baseline plus all `batch-v4-*` files. Historical direct-authored and normalized `src_op` batches are retained under `backend/fixtures/amazon-human/archive/`.
- `pnpm run db:verify:amazon` checks the live Supabase Amazon import after seeding.

## Rule

Every endpoint used by frontend or AI code should have one documented example request and one documented example response.
