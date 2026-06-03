# HAI

Human-AI Interaction project built around the AImazon shopping demo:

- `frontend/Amazon/`: shopping/product-comparison demo. This is the main development target.

The demo name is temporary. The code should keep working inside `frontend/Amazon/` until the project is renamed.

## Project Direction

The current main feature direction is **GroundedCompare**:

> AI evidence overlays that help users compare multiple visible items directly inside a dense result grid.

For the shopping demo, this means users should eventually be able to select multiple product cards, see evidence-backed summaries attached to those cards, inspect review snippets, compare items in place, and make a final decision without repeatedly opening detail pages.

## Simple Directory Structure

```text
.
|-- README.md
|-- AGENTS.md
|-- frontend/
|   `-- Amazon/
|-- backend/
|   |-- supabase/
|   |-- deployment/
|   `-- api-docs/
|-- ai/
|   |-- nl-request-agent/
|   |-- display-agent/
|   `-- shared/
`-- docs/
    |-- PROJECT.md
    |-- IMPLEMENTATION.md
    |-- SERVICE_DATA_FLOW.md
    |-- ROLES.md
    |-- BRANCHING.md
    |-- STUDY.md
    `-- archive/
```

## Where Things Go

- `frontend/Amazon/`: shopping demo code, app-local JSON data, and app-local assets.
- `backend/`: DB schema, Supabase setup, deployment, and API docs.
- `ai/nl-request-agent/`: natural-language command recognition and backend task request generation.
- `ai/display-agent/`: transforms returned data into UI-ready overlay/tray display payloads.
- `ai/shared/`: shared AI request/response contracts.
- `docs/PROJECT.md`: product goal, scope, and feature requirements.
- `docs/IMPLEMENTATION.md`: implementation plan, data/logging notes, and backlog.
- `docs/SERVICE_DATA_FLOW.md`: target AI service flow, query safety rules, and frontend/backend/AI data contract.
- `docs/ROLES.md`: detailed team responsibility split.
- `docs/BRANCHING.md`: branch and merge workflow for role-based development.
- `docs/STUDY.md`: user-study plan and metrics.
- `docs/archive/`: original proposal or old notes kept only for reference.
- `AGENTS.md`: short instructions for AI coding agents.

Do not add new top-level folders unless the project genuinely needs them.

## Running A Demo

Amazon is a React/Vite app:

```powershell
cd frontend/Amazon
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8000`.

Backend:

```powershell
cd backend
pnpm install
Copy-Item .env.example .env
# Fill DATABASE_URL in .env before running migrations.
pnpm run db:migrate
pnpm run db:seed:amazon
pnpm run dev
```

Verify the backend:

```text
http://127.0.0.1:8002/health
http://127.0.0.1:8002/api/demos/amazon/home
```

## Branch Workflow

- `main`: stable deployment/demo branch.
- `dev`: integration branch for active development.
- fixed role branches: `frontend`, `backend`, `ai-nl`, `ai-display`.
- each role branch merges into `dev`.

See `docs/BRANCHING.md`.

## Backend API Docs

Current backend API documentation is focused on page data, schema design, and study logging.

- `backend/api-docs/amazon-demo-api.md`: Amazon demo schema, Mermaid ER diagram, indexes, response models, and endpoint specs.
- `backend/supabase/README.md`: Supabase schema/migration workspace notes.

AI-agent-specific endpoints are not finalized yet. Add them only after the AI request/display contracts are agreed.
