# Amazon Prototype

This directory contains the active shopping-grid demo and is the main implementation target. It is implemented as a React/Vite app with Tailwind CSS.

## Files

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, cart state, product filters, detail modal, and Tailwind utility styling.
- `src/data.js`: loads and normalizes app-local product/review JSON.
- `src/styles.css`: Tailwind CSS entry file.
- `vite.config.js`: Vite config with React and Tailwind plugins.
- `package.json`: local dev/build scripts.
- `products.json`: app-local product metadata.
- `review.json`: app-local review snippets.
- `generate_reviews.py`, `generate_picture.py`: app-specific data or asset generation helpers.
- `picture/`: local image assets.

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
