# Amazon Human Fixture

This directory contains the older human-authored Amazon fixture set. It is retained for traceability and comparison, but it is not the current runtime data source for AImazon.

Current runtime data comes from Amazon Reviews 2023 Fashion imported through:

- `backend/scripts/import-amazon-2023.ts`
- `backend/scripts/enrich-amazon-2023-semantics.ts`
- `backend/scripts/verify-amazon-2023-db.ts`

## Layout

```text
amazon-human/
|-- README.md
|-- PROGRESS.md
|-- attribute_taxonomy.json
|-- seed/
`-- archive/
    |-- direct-authored/
    |-- src-op/
    `-- curated-source/
```

## Historical Use

- `seed/`: historical Supabase seed input for the pre-Amazon-2023 catalog.
- `archive/direct-authored/`: earlier direct-authored batches.
- `archive/src-op/`: normalized app-local imports retained for reference.
- `archive/curated-source/`: source prose for curated historical batches.

If this fixture is used for a controlled regression test, document that it is a legacy dataset and do not confuse its schema with the current `shopping_*` Amazon 2023 tables.

## Current Study Rule

For the active study, use the Amazon Reviews 2023 dataset and verify with:

```powershell
cd backend
pnpm run db:verify:amazon2023
pnpm run ai:qa:amazon2023
```
