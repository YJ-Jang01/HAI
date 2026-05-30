# Amazon Prototype

This directory contains the active shopping-grid demo and is the main implementation target. It is implemented as a React/Vite app with Tailwind CSS.

## Files

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, cart state, product filters, detail modal, and Tailwind utility styling.
- `src/data.js`: loads and normalizes app-local product/review JSON.
- `src/styles.css`: Tailwind CSS entry file.
- `vite.config.js`: Vite config with React and Tailwind plugins.
- `package.json`: local dev/build scripts.
- `products.json`: small app-local mock product metadata for the current frontend fallback flow.
- `review.json`: small app-local mock review snippets for the current frontend fallback flow.
- `attribute_taxonomy.json`: legacy app-local attribute fixture; backend human-authored seed no longer reads this file.
- `review_evidence.json`: legacy app-local evidence fixture; backend human-authored seed no longer reads this file.
- `scripts/generate_ai_catalog.py`: legacy deterministic no-API app-local data generator.
- `scripts/validate_ai_catalog.py`: legacy local validation for the app-local fallback fixture.
- `generate_reviews.py`, `generate_picture.py`: legacy app-specific data or asset generation helpers; do not use for the current AI-ready seed data.
- `picture/`: local image assets.

The Amazon API seed dataset is owned by backend under `backend/fixtures/amazon-human/`. It contains directly authored batch files, API-grounded product attributes, review profiles, issue-tagged evidence, and reviewer-fit data used by Supabase seeding.

## Current Role

This app should evolve into the main GroundedCompare prototype:

- numbered product cards
- multi-item selection
- in-place evidence overlays
- comparison tray
- evidence provenance
- repair/undo interaction
- study logging

## Local Running Notes

Install dependencies and run the Vite dev server.

Example:

```powershell
cd frontend/Amazon
npm install
npm run dev
```

Open `http://127.0.0.1:8000`.

Build:

```powershell
npm run build
```

## Future Organization

Keep this directory self-contained. If `src/App.jsx` grows too large, split app logic inside this directory:

- data loading
- rendering
- UI element registry
- selection
- evidence generation
- overlays
- comparison tray
- logger
- study mode
