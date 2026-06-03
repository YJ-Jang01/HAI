# AImazon Frontend

React/Vite shopping prototype for the AI Criteria Lens user study. The app renders Amazon-style shopping, dataset-backed filters, AI natural-language search, product comparison, review evidence snippets, product detail, cart, and checkout-button flow.

## Runtime Contract

- Frontend URL: `http://127.0.0.1:8000`
- Backend URL: `http://127.0.0.1:8002`
- Default API base: `VITE_AMAZON_API_BASE_URL=http://127.0.0.1:8002`
- Data source: backend Amazon Reviews 2023 Fashion APIs, not app-local mock JSON.
- Optional AI key location: `backend/.env` with `GEMINI_API_KEY`, `GEMINI_KEY`, or `gemini_key`.

Create `frontend/Amazon/.env` only if the backend runs somewhere else:

```text
VITE_AMAZON_API_BASE_URL=http://127.0.0.1:8002
```

## Run

```powershell
cd backend
pnpm run dev
```

```powershell
cd frontend/Amazon
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8000`.

Validation:

```powershell
pnpm run build
pnpm run e2e:amazon2023
```

Deployment:

- Vercel config lives in `vercel.json`.
- Set Vercel Root Directory to `frontend/Amazon`.
- Set `VITE_AMAZON_API_BASE_URL` to the Render backend URL.
- Full steps are in `../../docs/FREE_DEPLOYMENT.md`.

## Implemented User Flows

1. Home page presents a shopping-mall entry screen with hero products, department modules, product shelves, and working nav items.
2. AI button in the search bar toggles AI Criteria Lens mode. The button is icon-only and visually distinct when active.
3. With AI off, search uses regular catalog search and still keeps the left filter sidebar.
4. With AI on, search sends the natural-language query to `POST /api/ai/amazon2023/query`.
5. AI results show parsed criteria, clarification chips, matrix row toggles, and a product grid.
6. Clarification chips send criteria overrides back to the backend and update results while preserving history controls.
7. Left filters work on both regular and AI result grids without a full page reload.
8. `+ Compare` selects products for the bottom comparison matrix.
9. The comparison matrix shows common ground, key differences, partially shared traits, sortable product columns, remove buttons, and source snippet buttons only for evidence-backed cells.
10. Product image/name opens detail modal with features, options, reviews, and Add to Cart.
11. Add to Cart updates cart state and toast, then the cart page shows subtotal, quantity, recommendations, and checkout-button placeholder.

## File Roles

- `index.html`: Vite HTML entry.
- `src/App.jsx`: main React app, UI components, state, event handlers, localization, comparison matrix, cart.
- `src/data.js`: API calls, response normalization, fallback image mapping, logging helper.
- `src/styles.css`: Tailwind CSS entry and global styles.
- `vite.config.js`: React and Tailwind Vite config.
- `scripts/e2e-amazon2023-cdp.mjs`: Chrome/CDP E2E validation against built frontend and backend.
- `products.json`, `review.json`, `attribute_taxonomy.json`, `review_evidence.json`, `picture/`: legacy local assets/fixtures retained for reference only. Current runtime data comes from backend APIs.

## Important Components And Functions

`src/App.jsx`:

- `Header`: top Amazon-style header, language toggle, AI toggle, nav actions, search form, cart entry.
- `Home`: hero, departments, category modules, featured shelves.
- `ProductListing`: listing page shell, AI Criteria Lens panel, filter sidebar, result grid, pagination, comparison dock.
- `FilterSidebar`: department, price, rating, color, brand, and semantic filters.
- `ProductCard`: product thumbnail, rating, price, matched criteria chips, compare action.
- `ComparisonMatrix`: matrix rows, sorting, common/difference insights, remove buttons, source snippet loading.
- `ComparisonMatrixDock`: bottom-docked matrix container.
- `DetailModal`: product detail, options, review section, Add to Cart.
- `CartPage`: cart, subtotal, recommendations, checkout button.
- `handleSubmit`: chooses regular vs AI search based on AI toggle.
- `handleFilterChange`: applies sidebar filters and updates only the listing/grid state.
- `handleClarifyCriteria`: sends clarification override payloads and stores criteria history.
- `handleRestoreCriteriaHistory`: moves between previous and refined AI result states.
- `handleAddToCart`: updates cart quantity and toast.

`src/data.js`:

- `apiJson`: common backend fetch wrapper.
- `normalizeProduct`: maps Amazon 2023 API payloads into UI product shape.
- `loadCatalog`, `searchCatalogProducts`, `loadCatalogFacets`, `loadProductDetail`: catalog API functions.
- `runAiQuery`, `interpretAiQuery`, `compareAiProducts`, `loadAiEvidence`, `refineAiQuery`: AI Criteria Lens API functions.
- `logInteraction`: study logging call.

## API Endpoints Used

```text
GET  /api/demos/amazon/categories
GET  /api/demos/amazon/products
GET  /api/demos/amazon/products/facets
GET  /api/demos/amazon/products/:productId
POST /api/ai/amazon2023/query
POST /api/ai/amazon2023/compare
GET  /api/ai/amazon2023/query/:queryId/items/:productId/evidence
POST /api/ai/amazon2023/refine
POST /api/logs
```

## UI Screenshots

Captured against local `127.0.0.1:8000` and `127.0.0.1:8002`.

![Home](../../docs/screenshots/aimazon-home.png)

![Regular search filters](../../docs/screenshots/aimazon-search-filters.png)

![AI Criteria Lens](../../docs/screenshots/aimazon-ai-criteria.png)

![Comparison matrix](../../docs/screenshots/aimazon-comparison-matrix.png)

![Review/source snippets](../../docs/screenshots/aimazon-source-snippets.png)

![Product detail Add to Cart](../../docs/screenshots/aimazon-detail-add-to-cart.png)

![Cart](../../docs/screenshots/aimazon-cart.png)

![Checkout button click](../../docs/screenshots/aimazon-checkout-click.png)

## Study Notes

- Source snippet buttons should not appear when a matrix cell has no review or evidence payload. The cell should show `No review evidence available.` or `정보 없음`.
- The checkout button is currently a visible study-step placeholder. The future Google Docs connection should attach to this button.
- Korean mode should keep product card names, detail copy, reviews, and evidence snippets in Korean when backend locale support is available.
- Remote Amazon image URLs may fail; the UI falls back to deterministic product thumbnails instead of blank slots.
