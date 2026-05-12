# Supabase

This directory is for Supabase setup notes and optional Supabase-native files. The current source of truth for the database schema is `backend/drizzle/0000_initial.sql` plus the matching Drizzle schema in `backend/src/db/schema.ts`.

## What Belongs Here

- SQL migrations, if we later split migrations beyond `backend/drizzle/`.
- Seed data notes.
- Supabase local config.
- Edge functions, if the project uses them.
- Schema setup instructions.

## Current Setup Choice

Use Supabase as managed Postgres and Node.js as the API layer.

- Frontend calls Node.js endpoints.
- Node.js connects to Supabase Postgres with `DATABASE_URL`.
- `npm run db:migrate` creates tables, constraints, and indexes.
- `npm run db:seed:netflix` uploads `frontend/Netflix/data.json` into Supabase.

Do not put Supabase service-role keys in frontend code. The browser should not connect directly to the database for this project structure.

## Supabase Project Creation

1. Create a Supabase project.
2. Save the database password in a private place.
3. In Supabase, open the database connection string for Postgres.
4. Use a URI connection string with `sslmode=require`.
5. Put it in `backend/.env` as `DATABASE_URL`.

Example:

```text
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=require
```

For this backend, `DATABASE_URL` is required. If the Supabase project is not ready yet, finish the project creation first or use a local Postgres database with the same connection string format.

## Upload Netflix Frontend Data

Run from `backend/`:

```powershell
npm install
npm run db:migrate
npm run db:seed:netflix
```

The import command maps the current frontend mock data like this:

| Frontend JSON | Database |
| --- | --- |
| `name` | `media_items.title`, generated `media_items.slug` |
| `tag` | `media_tags`, `media_item_tags` |
| `img` | `media_assets` as `thumbnail` and `hero` |
| `video` | `media_assets` as `preview_video` |
| `desc` | `media_items.description` |
| `episodes[]` | `media_episodes` |

The existing Netflix rows are split into five shelves with six items each to match the current demo page layout.

## Normalization Rule

Use 4NF for core catalog data. Do not store independent multi-valued facts as arrays or repeated columns. For example, media tags, media assets, shelf membership, and episodes should be separate relations.

API responses may be nested JSON for frontend convenience, but database tables should remain normalized.

Netflix schema details are documented in:

- `backend/api-docs/netflix-demo-api.md`

## Current Netflix Tables

- `demo_sites`
- `media_items`
- `media_tags`
- `media_item_tags`
- `media_assets`
- `media_episodes`
- `media_episode_assets`
- `media_hero_items`
- `media_shelves`
- `media_shelf_items`
- `interaction_logs`

## Recommended Indexes

Add indexes for lookup, join, filtering, and ordering paths used by the APIs.

Netflix demo indexes are documented in:

- `backend/api-docs/netflix-demo-api.md`

## Rule

Do not manually edit production data during study runs. Use migrations and seed files so the setup is reproducible.
