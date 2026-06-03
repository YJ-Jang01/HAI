# Deployment

Deployment notes for the AImazon backend, Supabase database, and Amazon Reviews 2023 dataset operations.

## Runbooks

- `amazon2023-cutover-runbook.md`: backup approval, Amazon 2023 seed planning/import, semantic enrichment, image fallback, frontend/API validation, and rollback notes.
- `../../docs/FREE_DEPLOYMENT.md`: Vercel frontend + Render backend free-tier deployment guide.

## Local Production-Like Run

```powershell
cd backend
pnpm install
pnpm run check
pnpm run build
pnpm run db:migrate
pnpm run db:verify:amazon2023
pnpm start
```

Open:

```text
http://127.0.0.1:8002/health
http://127.0.0.1:8002/api/demos/amazon/products?limit=5
```

## Environment Variables

Set these on the Node host:

```text
PORT=8002
CORS_ALLOWED_ORIGINS=<frontend-origin-1>,<frontend-origin-2>
DATABASE_URL=<supabase-postgres-uri-with-sslmode-require>
DATABASE_SSL=true
GEMINI_API_KEY=<optional>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_AMAZON2023_LLM=on
AI_AMAZON2023_LLM_TIMEOUT_MS=4500
```

Never expose `DATABASE_URL`, Supabase service-role keys, Gemini keys, participant data, or private logs to browser code.

## Supabase Free Plan Guardrails

- Database limit: 500 MB.
- Storage limit: 1 GB.
- Keep product images as URLs in Postgres.
- Upload fallback thumbnails to Storage only when remote image URLs fail.
- Keep semantic attributes compact and product-level.
- Run `pnpm run db:verify:amazon2023` after import/enrichment.
- Stop or reduce import size if projected DB size crosses 485-490 MB.

## Dataset Refresh Checklist

Run from `backend/` only when replacing or expanding the dataset:

```powershell
pnpm run db:backup:supabase -- -IUnderstandFullRowBackup
pnpm run db:migrate
pnpm run dataset:profile:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz>
pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json --db-budget-mb 500
pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <reviews_Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json
pnpm run dataset:semantic:schema:amazon2023
pnpm run dataset:semantic:amazon2023 -- --dataset-slug amazon-fashion-2023 --mode apply --max-db-mb 490
pnpm run db:verify:amazon2023 -- --dataset-slug amazon-fashion-2023 --max-db-mb 490
```

Do not refresh seed data during a study unless logs and current catalog state are backed up.

## Validation Checklist

- `pnpm run check`
- `pnpm run build`
- `pnpm run db:verify:amazon2023`
- `pnpm run ai:qa:amazon2023`
- `pnpm run clarification:qa:amazon2023`
- `cd ../frontend/Amazon; pnpm run build`
- Browser smoke test of search, filters, comparison snippets, Add to Cart, cart, and checkout button.

## Checkout Handoff

The frontend currently exposes a checkout button on the cart page for the user-study flow. The planned Google Docs handoff should attach to that button later. Until then, clicking checkout is a visible interaction step, not a completed payment integration.
