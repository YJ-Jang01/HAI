# Implementation

## Role-Based Structure

```text
.
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
```

See `docs/ROLES.md` for ownership and deliverables.
See `docs/SERVICE_DATA_FLOW.md` for the target AI query flow, backend gatekeeping rules, and minimized frontend response contract.

## Current Integration Status

- `frontend/Amazon/` is the only active frontend demo.
- `backend/` provides the Node.js API and Supabase Postgres schema for the Amazon Reviews 2023 fashion catalog.
- Amazon frontend calls `http://127.0.0.1:8002` by default and runs on `http://127.0.0.1:8000`.
- The retired secondary demo code and data have been removed.

## Current App

### `frontend/Amazon/`

Main shopping demo.

Current files:

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, category/search rendering, filter sidebar, detail modal, AI Criteria Lens state, clarification controls, comparison matrix, and cart state.
- `src/data.js`: Amazon catalog/API client and AI Criteria Lens API normalization helpers.
- `src/styles.css`: Tailwind CSS entry file.

Already implemented:

- Amazon Reviews 2023 catalog API integration
- category browsing and general search
- product grid and product detail modal
- review rendering and evidence snippets
- search-bar AI toggle
- `/api/ai/amazon2023/query` parsed criteria flow
- ambiguity clarification chips
- left filter sidebar on search/listing result pages
- comparison matrix with selected products
- study logging endpoint

Missing or still under refinement:

- production-grade Gemini quota/error UX
- richer clarification history and undo for criteria refinements
- broader AI QA corpus coverage after Gemini quota is available
- visual polish for criteria and comparison matrix interactions

## Role-Based Implementation Order

### Frontend

1. Keep the left filter sidebar visible on all search/listing result pages.
2. Expose every backend-searchable catalog filter in the sidebar.
3. Render parsed AI criteria and clarification options from backend responses.
4. Keep product detail navigation on image/name click.
5. Add/remove products from the result grid into the comparison matrix.
6. Add repair/undo UI for AI criteria changes.
7. Add study logging hooks for every user-visible state transition.

### Backend

1. Keep Amazon Reviews 2023 schema, importer, verifier, and semantic enrichment reproducible.
2. Keep migrations focused on shopping catalog, review, evidence, semantic attributes, and study logs.
3. Maintain Amazon API docs.
4. Validate AI-generated filters against dataset-backed taxonomy and attributes.
5. Document deployment in `backend/deployment/`.

### AI Natural-Language Request Agent

1. Define command-to-task request schema.
2. Parse product criteria, ambiguity, repair commands, and visible UI context.
3. Generate backend task requests.
4. Provide examples for Amazon product-search commands.

### AI Display Agent

1. Define display payload schema.
2. Transform returned evidence into criteria, comparison, and snippet payloads.
3. Add uncertainty/provenance display fields.
4. Provide examples for frontend integration.

## Data Notes

Backend Amazon Reviews 2023 data is the source of truth when the demo depends on API-backed data.

- `backend/fixtures/amazon-human/`: legacy synthetic Amazon AI-ready package retained for historical QA only.
- Amazon Reviews 2023 fashion data is imported into Supabase through the Amazon 2023 dataset scripts.
- Do not commit raw downloaded datasets, generated reports, local DB backups, or fallback image binaries.

Before study use, check:

- product, image URL, price, brand, category, attribute, and review coverage
- semantic attribute coverage and confidence distribution
- category-context mismatches for common user queries
- review evidence grounding for comparison snippets
- Gemini quota/error behavior and fallback user messaging

## Logging Events Needed

For user study, log:

- task start/end
- search/category/filter changes
- detail modal open/close
- product select/deselect
- parsed criteria shown
- clarification selected
- comparison matrix updated
- repair command
- undo
- final choice

## Branching

Use role branches and merge through review. See `docs/BRANCHING.md`.
