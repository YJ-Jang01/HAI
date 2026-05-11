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

## Current Apps

### `frontend/Amazon/`

Main shopping demo.

Current files:

- `index.html`: shopping UI structure.
- `style.css`: shopping UI styles.
- `script.js`: data loading, category/search rendering, detail modal, reviews, cart count.
- `products.json`: app-local product data.
- `review.json`: app-local review data.
- `picture/`: app-local image assets.

Already implemented:

- category browsing
- search
- product grid
- product detail modal
- review rendering
- AI-style summary area in detail modal
- cart count/toast

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

- `index.html`
- `style.css`
- `script.js`
- `data.json`

Already implemented:

- media rows
- hero section
- expand modal with video
- simple tag/name search

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

1. Design Supabase schema.
2. Create migrations and seed data.
3. Document item/review/evidence/logging APIs.
4. Implement API or Supabase access pattern.
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

Keep current data app-local:

- `frontend/Amazon/products.json`
- `frontend/Amazon/review.json`
- `frontend/Netflix/data.json`

Before study use, normalize:

- product `price` as number
- product `reviewCount` as number
- stable review IDs
- review topic tags such as battery, durability, comfort, sound, price, shipping

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
