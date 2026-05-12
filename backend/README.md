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
npm run dev
```

Open:

- `http://127.0.0.1:8002/api/demos/netflix/home`
- `http://127.0.0.1:8002/api/demos/netflix/items?tag=action`

`DATABASE_URL` is required because the backend targets Supabase Postgres directly.

## Current Supabase Status

The current local backend has been verified against the Supabase project configured in `backend/.env`.

Verified commands:

```powershell
npm run db:migrate
npm run db:seed:netflix
npm run dev
```

Verified results:

- `drizzle/0000_initial.sql` was applied successfully.
- Netflix seed import completed with 30 media items, 3 tags, and 5 shelves.
- `GET /health` returned `{ "ok": true }`.
- `GET /api/demos/netflix/home` returned Supabase-backed Netflix home data.

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
- `src/db/schema.ts`: Drizzle table definitions with composite primary keys for join tables.
- `src/db/client.ts`: Supabase Postgres connection through `pg`.
- `src/routes/`: HTTP routes documented in `api-docs/netflix-demo-api.md`.
- `src/repositories/`: query and serialization logic.
- `src/scripts/migrate.ts`: applies `drizzle/0000_initial.sql`.
- `src/scripts/seed-netflix.ts`: imports `frontend/Netflix/data.json` into normalized tables.
- `drizzle/0000_initial.sql`: reproducible SQL schema migration.

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
- media items
- media tags
- media assets
- media episodes
- media shelves
- media hero placements
- interaction logs

AI evidence summaries and AI task tables should be added after the AI request/display contracts are finalized.

## Integration Rule

Backend should expose data in a shape that is easy for:

- frontend UI rendering
- future AI integration

If the API changes, update `docs/IMPLEMENTATION.md` and `backend/api-docs/`.
