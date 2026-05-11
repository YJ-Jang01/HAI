# Amazon Prototype

This directory contains the active shopping-grid demo and is the main implementation target.

## Files

- `index.html`: page structure.
- `style.css`: app-specific visual styling.
- `script.js`: app-specific frontend behavior.
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

Serve this directory through a local web server because `script.js` fetches JSON files.

Example:

```powershell
cd frontend/Amazon
python -m http.server 8000
```

Open `http://localhost:8000`.

## Future Organization

Keep this directory self-contained. If `script.js` grows too large, split app logic inside this directory:

- data loading
- rendering
- UI element registry
- selection
- evidence generation
- overlays
- comparison tray
- logger
- study mode
