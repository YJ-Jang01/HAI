# Frontend

Frontend now owns the AImazon shopping demo only.

## Responsibilities

- Implement and maintain the `Amazon` shopping demo.
- Build UI states for baseline search, AI Criteria Lens, product comparison, and study logging.
- Integrate backend Amazon 2023 API responses and AI display-agent outputs into the screen.

## Directory Layout

```text
frontend/
`-- Amazon/
```

## `Amazon/`

Main development target for product comparison and evidence overlays.

Expected work:

- natural-language product search
- AI criteria chips and clarification options
- left filter sidebar for all search/listing result pages
- multi-item selection
- comparison matrix
- source snippet expansion
- study logging hooks

## Run Locally

Amazon is a React/Vite app:

```powershell
cd frontend/Amazon
pnpm install
pnpm run dev
```

Open `http://127.0.0.1:8000`.
