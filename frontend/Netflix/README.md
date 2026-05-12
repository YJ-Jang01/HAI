# Netflix Prototype

This directory contains the secondary media-grid demo implemented as a React/Vite app.

## Files

- `index.html`: Vite HTML entry.
- `src/App.jsx`: React UI, interaction state, and Tailwind utility styling.
- `src/dataAdapter.js`: converts local mock data or backend API data into the view model.
- `src/styles.css`: Tailwind CSS entry file.
- `vite.config.js`: Vite config with React and Tailwind plugins.
- `data.json`: app-local content metadata used when no API base URL is configured.
- `.env.example`: optional backend API base URL config.

## Current Role

This prototype is useful for earlier project ideas around natural-language GUI control, OTT-style browsing, and ambiguous target selection. Keep it as a working demo, but use `frontend/Amazon/` for the main product-comparison implementation.

## Local Running Notes

Install dependencies and run the Vite dev server.

Example:

```powershell
cd frontend/Netflix
npm install
npm run dev
```

Open `http://127.0.0.1:8001`.

By default the app uses local `data.json`. To use the backend API, create `.env` from `.env.example` and set:

```text
VITE_NETFLIX_API_BASE_URL=http://127.0.0.1:8002
```
