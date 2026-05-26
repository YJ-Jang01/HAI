# Implementation

## Role-Based Structure

```text
.
|-- frontend/
|   |-- Amazon/
|   `-- Netflix/
|-- backend/
|   |-- supabase/
|   |-- deployment/
|   `-- api-docs/
|-- ai/
|   |-- nl-request-agent/
|   |-- display-agent/
|   `-- shared/
`-- docs/
```

See `docs/ROLES.md` for ownership and deliverables.

## Current Integration Status

- `dev` contains the latest `backend` and `frontend` branch work.
- `backend/` provides the Node.js API and Supabase Postgres schema/seed flow.
- `frontend/Netflix/` is a React/Vite/Tailwind app and uses the backend API by default.
- Netflix can still run from local mock data only when `VITE_USE_MOCK_DATA=true`.

Run order for the integrated Netflix demo:

1. Start `backend/` on `http://127.0.0.1:8002`.
2. Start `frontend/Netflix/` on `http://127.0.0.1:8001`.
3. Verify `GET /api/demos/netflix/home` in the browser Network tab.

## Current Apps

### `frontend/Amazon/`

Main shopping demo.

Current files:

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, category/search rendering, filters, detail modal, reviews, and cart state.
- `src/data.js`: product/review JSON loading and normalization helpers.
- `src/styles.css`: Tailwind CSS entry file.
- `products.json`: app-local fallback product data.
- `review.json`: app-local fallback review data.
- `picture/`: app-local image assets.

Already implemented:

- category browsing
- search
- product grid
- product detail modal
- review rendering
- AI-style summary area in detail modal
- cart count/toast
- React/Vite/Tailwind frontend implementation
- backend Amazon schema, migration, v2 seed import, review intelligence data, and page-data API

Missing for GroundedCompare:

- visible product numbers
- multi-item selection
- evidence overlays on selected cards
- comparison tray
- source snippet expansion in grid
- repair/undo
- study logging/export

### `frontend/Netflix/`

Secondary media demo.

Current files:

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, interaction state, and Tailwind utility styling.
- `src/dataAdapter.js`: local mock/backend API data adapter.
- `src/styles.css`: Tailwind CSS entry file.
- `data.json`
- `package.json`

Already implemented:

- media rows
- hero section
- expand modal with video
- simple tag/name search
- backend API integration by default through `VITE_NETFLIX_API_BASE_URL`
- local mock fallback only when `VITE_USE_MOCK_DATA=true`

## Role-Based Implementation Order

### Frontend

1. Add visible numbers to product cards in `frontend/Amazon/`.
2. Add selected-card state and multi-select by click.
3. Add number input selection, such as `2, 5, 8`.
4. Render compact evidence overlays on selected cards.
5. Add expandable source snippets.
6. Add comparison tray.
7. Add repair/undo UI.
8. Add study logging hooks.

### Backend

1. Extend Supabase schema/API as frontend and AI contracts evolve.
2. Keep migrations and seed data reproducible.
3. Maintain Amazon and Netflix API docs.
4. Add item/review/evidence logging APIs when AI contracts are finalized.
5. Document deployment in `backend/deployment/`.
6. Deploy backend or document local setup.

### AI Natural-Language Request Agent

1. Define command-to-task request schema.
2. Parse visible numbers, item attributes, criteria, and repair commands.
3. Generate backend task requests.
4. Provide examples for Amazon and Netflix commands.

### AI Display Agent

1. Define display payload schema.
2. Transform returned evidence into overlay/tray payloads.
3. Add uncertainty/provenance display fields.
4. Provide examples for frontend integration.

## Data Notes

Keep small frontend fallback data app-local, but use backend fixtures as the source of truth when a demo depends on API-backed data.

- `frontend/Amazon/products.json`: frontend fallback fixture only.
- `frontend/Amazon/review.json`: frontend fallback fixture only.
- `backend/fixtures/amazon/`: Amazon v2 API seed with products, reviews, review profiles, attribute taxonomy, and issue evidence.
- `frontend/Netflix/data.json`: Netflix frontend/backend seed source.

Amazon product/review data is imported into Supabase by `npm run db:seed:amazon`. Before study use, check:

- generated product rating matches review rating averages
- review profile coverage is complete
- negative and neutral evidence ratios remain high enough for tradeoff comparison
- evidence text is present in the review body
- final gold/evaluation rows have human review approval if used for formal evaluation

## Logging Events Needed

For user study, log:

- task start/end
- search/category/filter changes
- detail modal open/close
- product select/deselect
- overlay shown
- snippet expanded
- repair command
- undo
- final choice

For the static prototype, logs can be kept in memory and exported as JSON.

## Cross-Role Contracts

### Frontend To AI NL Agent

Frontend should provide:

- raw user command
- current demo name
- visible UI registry
- current selected items
- current study condition

### AI NL Agent To Backend

AI request agent should provide:

- intent
- selected item references
- criteria
- filters
- repair operation, if any
- requested data type

### Backend To AI Display Agent

Backend should provide:

- item metadata
- review/evidence snippets
- generated summaries, if available
- confidence or uncertainty metadata

### AI Display Agent To Frontend

Display agent should provide:

- overlays
- comparison tray entries
- snippet groups
- warnings or uncertainty cues
- display mode

## Branching

Use role branches and merge through review. See `docs/BRANCHING.md`.
