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
- API contracts for AI agents

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
- AI evidence summaries
- user study sessions
- interaction logs
- tasks and conditions

## Integration Rule

Backend should expose data in a shape that is easy for both:

- frontend UI rendering
- AI display-agent transformation

If the API changes, update `docs/IMPLEMENTATION.md` and `backend/api-docs/`.
