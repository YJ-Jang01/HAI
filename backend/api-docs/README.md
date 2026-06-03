# API Docs

This directory documents backend data contracts used by the AImazon frontend, AI Criteria Lens, importer, and study logging.

## Current Docs

- `amazon2023-api.md`: current Amazon Reviews 2023 catalog, import, image fallback, semantic attributes, verification, and endpoint contract.
- `amazon-ai-api.md`: AI Criteria Lens query, clarification, comparison, evidence, and refine contracts.
- `amazon-demo-api.md`: older Amazon demo reference retained for comparison while the current runtime uses Amazon 2023 tables and routes.

## Runtime Routes

Catalog routes are mounted at both `/api/demos/amazon` and `/api/demos/amazon2023`:

```text
GET /categories
GET /products
GET /products/facets
GET /products/batch
GET /products/:productId
```

AI routes are mounted at both `/api/ai/amazon` and `/api/ai/amazon2023`:

```text
POST /interpret
POST /query
POST /compare
GET  /query/:queryId/items/:productId/evidence
POST /refine
```

Study logging:

```text
POST /api/logs
```

## Implementation Anchors

- `backend/src/routes/amazon2023.ts`: catalog endpoint handlers and query-param parsing.
- `backend/src/routes/amazon2023-ai.ts`: AI Criteria Lens endpoint handlers.
- `backend/src/repositories/amazon2023.ts`: DB query and serialization logic.
- `backend/src/db/schema.ts`: Drizzle schema.
- `backend/scripts/import-amazon-2023.ts`: Amazon 2023 importer.
- `backend/scripts/enrich-amazon-2023-semantics.ts`: semantic enrichment.
- `backend/scripts/verify-amazon-2023-db.ts`: live DB verifier.

## Documentation Rule

Every endpoint used by frontend or AI code should document:

- URL and method
- request params/body
- response shape
- error shape
- frontend state that consumes it
- DB tables involved

When route behavior changes, update the matching API doc and the relevant README in the same change.
