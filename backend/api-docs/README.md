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
- DB schema and indexes needed by those APIs

AI-agent-specific APIs are intentionally not defined here yet. Add them after AI request/display contracts are stable.

## API Docs

- `amazon-demo-api.md`: Amazon shopping demo schema and endpoint specification.
- `netflix-demo-api.md`: Netflix demo schema and endpoint specification.

## Current Implementation

- Node.js/Express routes live in `backend/src/routes/`.
- Drizzle schema lives in `backend/src/db/schema.ts`.
- `npm run db:migrate` applies all SQL files in `backend/drizzle/` to Supabase Postgres.
- `npm run db:seed:netflix` imports `frontend/Netflix/data.json`.
- `npm run db:seed:amazon` imports `frontend/Amazon/products.json` and `frontend/Amazon/review.json`.

## Rule

Every endpoint used by frontend or AI code should have one documented example request and one documented example response.
