# Free Deployment Guide

This guide deploys the current AImazon stack with free-tier services:

- Frontend: Vercel static deployment from `frontend/Amazon`
- Backend: Render Free Web Service from `backend`
- Database/storage: existing Supabase Free project

## Deployment Shape

```text
Browser
  -> Vercel static frontend
  -> Render backend API
  -> Supabase Postgres / Storage
  -> Gemini API
```

## Files Added For Deployment

- `frontend/Amazon/vercel.json`: Vercel build/output settings and SPA rewrite.
- `frontend/Amazon/.env.example`: frontend API base URL example.
- `render.yaml`: Render Blueprint for the backend Web Service.
- `backend/src/server.ts`: binds to `HOST` and `PORT` for hosted environments.

## 1. Deploy Backend On Render

Create a new Render Web Service or Blueprint from the GitHub repository.

Recommended settings if creating manually:

```text
Repository: YJ-Jang01/HAI
Branch: dev
Root Directory: backend
Runtime: Node
Build Command: corepack enable && pnpm install --frozen-lockfile && pnpm run build
Start Command: node dist/server.js
Health Check Path: /health
Plan: Free
```

Environment variables:

```text
NODE_ENV=production
HOST=0.0.0.0
DATABASE_SSL=true
DATABASE_URL=<Supabase Postgres URL with sslmode=require>
GEMINI_API_KEY=<Gemini API key>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_AMAZON2023_LLM=on
AI_AMAZON2023_LLM_TIMEOUT_MS=4500
CORS_ALLOWED_ORIGINS=<Vercel frontend URL, add later if not known yet>
```

After Render deploys, verify:

```text
https://<render-service>.onrender.com/health
https://<render-service>.onrender.com/api/demos/amazon/products?limit=5
```

## 2. Deploy Frontend On Vercel

Create a Vercel project from the same GitHub repository.

Settings:

```text
Repository: YJ-Jang01/HAI
Branch: dev
Framework Preset: Vite
Root Directory: frontend/Amazon
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm run build
Output Directory: dist
```

Environment variables:

```text
VITE_AMAZON_API_BASE_URL=https://<render-service>.onrender.com
```

Deploy and note the Vercel URL:

```text
https://<vercel-project>.vercel.app
```

## 3. Connect CORS

Return to Render and set:

```text
CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app
```

If Vercel creates preview URLs that need testing, add them as comma-separated origins:

```text
CORS_ALLOWED_ORIGINS=https://<vercel-project>.vercel.app,https://<preview-url>.vercel.app
```

Redeploy or restart the Render backend after changing env vars.

## 4. Post-Deploy Smoke Test

Use the deployed Vercel site and verify:

1. Home loads with product shelves.
2. Regular search returns products.
3. Left filters update the result grid.
4. AI search returns AI Criteria Lens and parsed criteria.
5. Clarification chip changes results.
6. Compare 2-4 products.
7. Source snippets opens review/comment evidence.
8. Add to Cart from product detail.
9. Cart page shows subtotal.
10. Checkout button is clickable.
11. `POST /api/logs` succeeds in the browser network panel.

## Known Free-Tier Risks

- Render Free can spin down after idle time, so first request may be slow.
- Gemini free quota can be exhausted; do not replace LLM behavior with rule-based behavior during study interpretation.
- Supabase Free DB has little headroom. Do not import more data before checking `pnpm run db:verify:amazon2023`.
- Checkout is currently a UI placeholder. The Google Docs handoff is not implemented yet.
