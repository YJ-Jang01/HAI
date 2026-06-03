# Frontend

Frontend currently owns one active app: `frontend/Amazon/`.

## Scope

- Render the AImazon shopping experience.
- Support regular search and AI Criteria Lens search from the same header search bar.
- Keep the left filter sidebar available on listing/search pages.
- Let users select 2-4 products and compare them in a bottom-docked matrix.
- Open dataset-backed review/source snippets from the matrix.
- Support product detail, Add to Cart, cart review, and checkout-button study flow.
- Send study events to the backend logging API.

## Layout

```text
frontend/
|-- README.md
`-- Amazon/
    |-- README.md
    |-- package.json
    |-- src/
    |   |-- App.jsx
    |   |-- data.js
    |   `-- styles.css
    `-- scripts/
        `-- e2e-amazon2023-cdp.mjs
```

## Run

Start the backend first, then run:

```powershell
cd frontend/Amazon
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8000`.

Build and browser validation:

```powershell
pnpm run build
pnpm run e2e:amazon2023
```

## Main Implementation Files

- `Amazon/src/App.jsx`: UI components and state transitions for search, filters, AI Criteria Lens, comparison, product detail, cart, language mode, and toasts.
- `Amazon/src/data.js`: backend API client and payload normalization.
- `Amazon/scripts/e2e-amazon2023-cdp.mjs`: headless Chrome/CDP user-flow validation.
- `../docs/screenshots/`: README screenshot artifacts captured from the local app.

See `frontend/Amazon/README.md` for component/function details and the screenshot gallery.
