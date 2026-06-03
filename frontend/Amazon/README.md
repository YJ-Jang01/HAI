# Amazon Prototype

This directory contains the active shopping-grid demo and is the main implementation target. It is implemented as a React/Vite app with Tailwind CSS.

## Files

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, cart state, product filters, detail modal, AI Criteria Lens parsed-criteria state, clarification controls, bottom comparison matrix, and Tailwind utility styling.
- `src/data.js`: calls the backend Amazon catalog and AI Criteria Lens APIs, then normalizes API payloads for the UI.
- `src/styles.css`: Tailwind CSS entry file.
- `vite.config.js`: Vite config with React and Tailwind plugins.
- `package.json`: local dev/build scripts.
- `products.json`: legacy app-local mock product metadata; not the default runtime data source.
- `review.json`: legacy app-local mock review snippets; not the default runtime data source.
- `attribute_taxonomy.json`: legacy app-local attribute fixture; backend human-authored seed no longer reads this file.
- `review_evidence.json`: legacy app-local evidence fixture; backend human-authored seed no longer reads this file.
- `scripts/generate_ai_catalog.py`: legacy deterministic no-API app-local data generator.
- `scripts/validate_ai_catalog.py`: legacy local validation for the app-local fallback fixture.
- `generate_reviews.py`, `generate_picture.py`: legacy app-specific data or asset generation helpers; do not use for the current AI-ready seed data.
- `picture/`: local image assets.

The Amazon API seed dataset is owned by backend under `backend/fixtures/amazon-human/`. The current local fixture uses the v3 baseline plus cumulative `seed/batch-v4-*.json` expansion batches with API-grounded product attributes, uneven review counts, review metadata, reviewer profiles, and issue-tagged evidence. Historical normalized `src_op` batches are retained in backend under `archive/` but are not loaded.

## Current Role

This app should evolve into the main GroundedCompare prototype:

- backend API-backed catalog loading
- Korean/English UI mode with a header language toggle
- Korean and English catalog search terms routed through the backend API
- product/category-aware image fallback when a remote product image fails to load
- icon-only AI Criteria Lens state control in the search bar; natural-language search parsing is always on for typed queries
- parsed criteria bar from the user's natural-language query
- lightweight ambiguity clarification chips with estimated result counts
- numbered product cards in AI mode
- multi-item add/remove from the result grid
- bottom comparison matrix on the same search results page
- repair/refine interaction without a chat panel
- study logging through `POST /api/logs`

## Local Running Notes

Install dependencies and run the Vite dev server.

Start the backend first:

```powershell
cd backend
pnpm run dev
```

For AI mode, also run the Python agents:

```powershell
cd ai/nl-request-agent
uv run uvicorn main:app --host 127.0.0.1 --port 8011
```

```powershell
cd ai/display-agent
uv run uvicorn main:app --host 127.0.0.1 --port 8012
```

Both agent processes require a Gemini key in their environment, local `.env` files, or `backend/.env`.
Accepted names are `GEMINI_API_KEY`, `GEMINI_KEY`, and `gemini_key`.
The NL request agent is the preferred parser for AI Criteria Lens search. If it is unavailable or too slow during local development, the backend uses a constrained taxonomy/attribute fallback and includes a warning in the response instead of leaving the UI with an empty stale result.
If Gemini is temporarily unavailable inside a running NL agent, the agent may also return a temporary Codex-authored fallback intent. Backend still constrains execution to DB-backed taxonomy and attribute filters.

Then start Amazon:

```powershell
cd frontend/Amazon
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8000`.

Language behavior:

- The UI starts from the browser language when possible and stores the user's choice in `localStorage`.
- Use the `KO`/`EN` button in the header to switch between English and Korean UI labels.
- The active language is sent as `locale` to catalog/product detail APIs, so product names, descriptions, feature bullets, review text, reviewer profile labels, and evidence snippets are returned in the same language when supported.
- Search supports English and Korean product/attribute terms such as `coat`, `backpack`, `코트`, `백팩`, `겨울 출근용 코트`, and `가벼운 백팩`.
- Natural-language searches always send the active locale in `visibleContext.locale`; the backend still validates all AI output against its catalog taxonomy and Supabase data before returning products.
- Parsed criteria, selected-card attribute chips, color labels, and AI relaxation warnings are localized in Korean mode so raw values such as `Technical Shell`, `Adjustable`, and `Sky Blue` do not leak into the UI.

AI Criteria Lens flow:

1. User searches in English or Korean. The icon-only AI lens is always active for typed natural-language queries.
2. The frontend clears any previous parsed criteria immediately and renders lightweight draft criteria from the typed query, so the user does not wait on the NL agent before seeing the new criteria frame.
3. The frontend calls `POST /api/ai/amazon/query`; the backend response replaces the draft with validated parsed criteria, ambiguity chips, product cards, review strengths, review risks, and comparison dimensions in one grounded payload.
4. Ambiguous criteria appear as compact chips, for example `Style: Office / Minimal / Classic` or `Price: Under $90 / Under $135 / Value-ranked`.
5. Product image/name clicks still open the product detail modal.
6. `+ Compare` adds a product to the comparison matrix at the bottom of the grid; `Remove` takes it out.
7. The matrix refreshes through `POST /api/ai/amazon/compare` whenever selected products or active criteria change.
8. Editing a clarification chip sends a criteria override back to the backend and refreshes the results without using a chat panel or drawer.
9. If the NL request agent is unavailable or too slow, the backend uses grounded taxonomy/attribute fallback rules and marks that warning in the response instead of returning an empty result.

The frontend defaults to:

```text
VITE_AMAZON_API_BASE_URL=http://127.0.0.1:8002
```

Create `frontend/Amazon/.env` only if the backend uses a different base URL.

Build:

```powershell
pnpm run build
```

## Future Organization

Keep this directory self-contained. If `src/App.jsx` grows too large, split app logic inside this directory:

- data loading
- rendering
- UI element registry
- selection
- parsed criteria and clarification controls
- comparison matrix
- logger
- study mode
