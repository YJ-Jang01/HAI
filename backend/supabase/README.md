# Supabase

This directory is for Supabase setup notes and optional Supabase-native files. The current source of truth for the database schema is `backend/drizzle/` plus the matching Drizzle schema in `backend/src/db/schema.ts`.

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
- `pnpm run db:migrate` creates tables, constraints, and indexes.
- `pnpm run db:seed:amazon` uploads the current Amazon AI-ready batch fixture from `backend/fixtures/amazon-human/` into Supabase. When `seed/batch-v4-*.json` files exist, the importer loads the v3 baseline plus all v4 cumulative expansion batches.
- `pnpm run db:verify:amazon` verifies the live Amazon import counts and key data-quality checks.
- `pnpm run db:seed:netflix` uploads `frontend/Netflix/data.json` into Supabase.

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
pnpm install
pnpm run db:migrate
pnpm run db:seed:netflix
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

## Upload Amazon Human-Authored Batch Data

Run from `backend/`:

```powershell
pnpm install
pnpm run db:migrate
pnpm run db:seed:amazon
pnpm run db:verify:amazon
```

The import command maps the current AI-ready v3 batch fixture data like this:

| Fixture JSON | Database |
| --- | --- |
| `fixtures/amazon-human/attribute_taxonomy.json` | `product_attribute_definitions`, `product_attribute_options` |
| `seed/*.json.products[]` | `products`, `product_assets`, `product_features`, `product_option_groups`, `product_rating_breakdown`, `product_attribute_values` |
| `seed/*.json.reviews[]` | `product_reviews` |
| `seed/*.json.reviewProfiles[]` | `product_review_profiles` |
| `seed/*.json.reviewEvidence[]` | `product_review_evidence` |

## Normalization Rule

Use 4NF for core catalog data. Do not store independent multi-valued facts as arrays or repeated columns. For example, product assets, features, options, rating buckets, reviews, media tags, shelf membership, and episodes should be separate relations.

API responses may be nested JSON for frontend convenience, but database tables should remain normalized.

Netflix schema details are documented in:

- `backend/api-docs/amazon-demo-api.md`
- `backend/api-docs/netflix-demo-api.md`

## Current Amazon Tables

- `product_categories`
- `product_subcategories`
- `products`
- `product_assets`
- `product_features`
- `product_option_groups`
- `product_option_values`
- `product_rating_breakdown`
- `product_reviews`
- `product_review_profiles`
- `product_review_evidence`
- `product_attribute_definitions`
- `product_attribute_options`
- `product_attribute_values`

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

- `backend/api-docs/amazon-demo-api.md`
- `backend/api-docs/netflix-demo-api.md`

## Rule

Do not manually edit production data during study runs. Use migrations and seed files so the setup is reproducible.
