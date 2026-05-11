# Backend

Backend owns the database schema, Supabase setup, deployment, and API documentation.

## Responsibilities

- Design the database schema.
- Build and configure Supabase.
- Manage migrations and seed data.
- Define APIs used by frontend and AI modules.
- Deploy backend services.
- Write and maintain API documentation.
- Provide stable mock/staging data for frontend and AI integration.

## Directory Layout

```text
backend/
|-- README.md
|-- supabase/
|-- deployment/
`-- api-docs/
```

## `supabase/`

Put Supabase project files here:

- migrations
- seed data
- edge functions, if used
- local Supabase config
- schema notes

Recommended future structure:

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

- `api-docs/netflix-demo-api.md`: Netflix page-data API, 4NF schema, Mermaid ER diagram, recommended indexes, response models, and error model.

## `deployment/`

Put deployment instructions here:

- Supabase project setup
- environment variables
- deploy commands
- deployment checklist
- rollback notes

## Core Data Entities

Initial schema should cover:

- demo sites
- products or media items
- reviews or evidence sources
- user study sessions
- interaction logs
- tasks and conditions

AI evidence summaries and AI task tables should be added after the AI request/display contracts are finalized.

## Integration Rule

Backend should expose data in a shape that is easy for:

- frontend UI rendering
- future AI integration

If the API changes, update `docs/IMPLEMENTATION.md` and `backend/api-docs/`.
