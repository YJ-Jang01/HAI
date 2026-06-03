# Deployment

This directory is for backend deployment notes and checklists.

## What Belongs Here

- Supabase project setup steps.
- Required environment variables.
- Deployment commands.
- Deployment checklist.
- Rollback notes.
- Links to deployed project dashboards, if safe to share.

## Runbooks

- `amazon2023-cutover-runbook.md`: live-data backup gate, Amazon Reviews 2023 seed planning/import, image fallback candidates, and frontend/API validation.

## Initial Deployment Checklist

- [ ] Supabase project created.
- [ ] Database schema applied.
- [ ] Seed data loaded.
- [ ] API access pattern documented.
- [ ] Logging storage verified.
- [ ] Frontend environment/config updated.
- [ ] Demo flow tested from deployed backend.

## Rule

Do not commit secrets, service-role keys, or private participant data.

## Free Deployment Direction

Use Supabase free tier for Postgres and deploy the Node.js API to a free Node-capable hosting option.

Recommended no-budget path for now:

1. Supabase free project for the database.
2. Local Node.js development against Supabase or a local Postgres database.
3. Deploy the Node.js API later to a free service that supports Node web processes.
4. Keep static demo pages separate unless the frontend team converts them into a deployable frontend app.

## Environment Variables

Set these on the deployed Node.js host:

```text
PORT=8002
CORS_ALLOWED_ORIGINS=<frontend-origin-1>,<frontend-origin-2>
DATABASE_URL=<supabase-postgres-uri-with-sslmode-require>
DATABASE_SSL=true
```

Never expose `DATABASE_URL` or Supabase service-role credentials to browser code.

## Supabase First-Time Setup

Run from `backend/` after `backend/.env` points to Supabase:

```powershell
pnpm install
pnpm run check
pnpm run db:migrate
pnpm run db:seed:amazon
```

Then verify:

```powershell
pnpm run dev
```

Open `http://127.0.0.1:8002/api/demos/amazon/products?limit=5`.

## Deployment Commands

Most hosts need equivalent commands:

```bash
pnpm install
pnpm run build
pnpm run db:migrate
pnpm run db:seed:amazon
pnpm start
```

Run seed commands only when seed data should be refreshed. `db:seed:amazon` clears and reloads the Amazon catalog for the `amazon` demo site, so during an actual study, avoid reseeding unless logs and catalog state have already been backed up and the team agrees to reset demo data.
