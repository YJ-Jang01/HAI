# Frontend

Frontend owns the demo sites and the mock data that fills those sites.

## Responsibilities

- Implement and maintain the `Amazon` shopping demo.
- Implement and maintain the `Netflix` media demo.
- Create app-local mock data for demos.
- Build UI states for baseline, chat-only AI, and in-place AI evidence overlay conditions.
- Integrate backend API responses and AI display-agent outputs into the screen.
- Add interaction logging hooks required by the study.

## Directory Layout

```text
frontend/
|-- Amazon/
`-- Netflix/
```

## Demo Ownership

### `Amazon/`

Main development target for product comparison and evidence overlays.

Expected work:

- numbered product cards
- multi-item selection
- in-place evidence overlays
- comparison tray
- source snippet expansion
- study logging hooks

### `Netflix/`

Secondary media demo.

Expected work:

- OTT/media card interactions
- ambiguous selection examples
- media mock data
- optional numbered candidate overlay

## Data Rule

Keep mock data inside each demo while it is app-specific:

- `frontend/Amazon/products.json`
- `frontend/Amazon/review.json`
- `frontend/Netflix/data.json`

Move data to a shared location only if both frontend and backend need the exact same fixture.

## Run Locally

Amazon is still a static prototype:

```powershell
cd frontend/Amazon
python -m http.server 8000
```

Open `http://localhost:8000`.

Netflix is a React/Vite app:

```powershell
cd frontend/Netflix
npm install
npm run dev
```

Open `http://127.0.0.1:8001`.
