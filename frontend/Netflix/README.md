# Netflix Prototype

This directory contains the secondary media-grid demo.

## Files

- `index.html`: page structure.
- `style.css`: app-specific visual styling.
- `script.js`: app-specific frontend behavior.
- `data.json`: app-local content metadata.

## Current Role

This prototype is useful for earlier project ideas around natural-language GUI control, OTT-style browsing, and ambiguous target selection. Keep it as a working demo, but use `frontend/Amazon/` for the main product-comparison implementation.

## Local Running Notes

Serve this directory through a local web server because `script.js` fetches `data.json`.

Example:

```powershell
cd frontend/Netflix
python -m http.server 8001
```

Open `http://localhost:8001`.
