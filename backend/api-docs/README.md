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

- `netflix-demo-api.md`: Netflix demo schema and endpoint specification.

## Rule

Every endpoint used by frontend or AI code should have one documented example request and one documented example response.
