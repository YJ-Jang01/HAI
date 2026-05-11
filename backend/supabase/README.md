# Supabase

This directory is for Supabase schema, migrations, seed data, and backend functions.

## What Belongs Here

- SQL migrations.
- Seed data.
- Supabase local config.
- Edge functions, if the project uses them.
- Schema setup instructions.

## Normalization Rule

Use 4NF for core catalog data. Do not store independent multi-valued facts as arrays or repeated columns. For example, media tags, media assets, shelf membership, and episodes should be separate relations.

API responses may be nested JSON for frontend convenience, but database tables should remain normalized.

Netflix schema details are documented in:

- `backend/api-docs/netflix-demo-api.md`

## Suggested Tables

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
- `product_items`
- `product_reviews`
- `product_assets`
- `evidence_summaries`
- `study_tasks`
- `study_sessions`
- `interaction_logs`

## Recommended Indexes

Add indexes for lookup, join, filtering, and ordering paths used by the APIs.

Netflix demo indexes are documented in:

- `backend/api-docs/netflix-demo-api.md`

## Rule

Do not manually edit production data during study runs. Use migrations and seed files so the setup is reproducible.
