# Team Roles

The project is split into four development responsibilities. Each role has a clear owner path so work can happen in parallel and merge into `dev` with fewer conflicts.

## 1. Frontend

### Owner Paths

- `frontend/`
- `frontend/Amazon/`
- `frontend/Netflix/`

### Main Responsibility

Frontend implements the two demo pages and the mock data needed to make them usable before the backend is fully connected.

### Detailed Responsibilities

- Build and maintain the Amazon shopping demo page.
- Build and maintain the Netflix media demo page.
- Create mock product, review, media, and episode data for the demos.
- Implement grids, cards, detail modals, selection states, overlays, comparison tray, and study-condition UI.
- Render backend data and AI display-agent payloads on screen.
- Add frontend logging hooks for user-study events.
- Keep each demo runnable with a local static server.

### Deliverables

- Working `frontend/Amazon/` demo.
- Working `frontend/Netflix/` demo.
- App-local mock datasets:
  - `frontend/Amazon/products.json`
  - `frontend/Amazon/review.json`
  - `frontend/Netflix/data.json`
- UI states for:
  - baseline browsing
  - chat-only AI
  - in-place evidence overlay
  - provenance/repair mode, if implemented
- Integration points for backend APIs and AI display payloads.

### Not Owned

- Supabase schema and deployment.
- LLM prompt/parser internals.
- Backend API implementation.

## 2. Backend

### Owner Paths

- `backend/`
- `backend/supabase/`
- `backend/api-docs/`
- `backend/deployment/`

### Main Responsibility

Backend designs and deploys the data layer and API surface used by frontend and AI modules.

### Detailed Responsibilities

- Design the database schema.
- Set up Supabase.
- Write migrations, seed data, and local setup instructions.
- Define API endpoints and response contracts.
- Deploy backend services or document deployment steps.
- Write API documentation.
- Store and serve:
  - demo site metadata
  - products/media items
  - reviews/evidence snippets
  - AI task requests/results
  - study tasks and conditions
  - interaction logs
  - final participant choices

### Deliverables

- Supabase schema and migration plan.
- Seed data for frontend and AI integration.
- API docs with request/response examples.
- Deployment guide or deployed Supabase/backend instance.
- Logging endpoint or logging storage plan.

### Not Owned

- Visual UI rendering.
- Natural-language parsing logic.
- Display optimization logic for overlays/trays.

## 3. AI Developer 1: Natural-Language Request Agent

### Owner Paths

- `ai/nl-request-agent/`
- shared request schema files in `ai/shared/`

### Main Responsibility

AI Developer 1 recognizes user natural-language commands and turns them into structured backend task requests.

### Detailed Responsibilities

- Parse user commands such as:
  - "compare 2 and 5"
  - "show battery complaints only"
  - "replace 3 with the one on the right"
  - "find the cheapest wireless one"
- Detect intent:
  - select items
  - compare items
  - filter evidence
  - repair selection
  - clear selection
  - request detail/evidence
- Resolve references using frontend-provided context:
  - visible card numbers
  - item names
  - item attributes
  - selected items
  - relative positions, if supported
- Convert parsed intent into a backend request.
- Coordinate with backend on required fields and error handling.

### Deliverables

- Command parser or LLM prompt pipeline.
- Structured task request schema.
- Example command set for Amazon and Netflix.
- Request validation rules.
- Integration notes for frontend and backend.

### Not Owned

- DB schema.
- Final UI layout.
- Study logging storage.

## 4. AI Developer 2: Display Agent

### Owner Paths

- `ai/display-agent/`
- shared display schema files in `ai/shared/`

### Main Responsibility

AI Developer 2 transforms backend/AI return data into display-ready payloads that help the user compare items efficiently.

### Detailed Responsibilities

- Convert backend data into:
  - evidence overlays
  - comparison tray entries
  - snippet expansion groups
  - warnings or uncertainty cues
  - chat-panel summaries, if needed
- Decide what evidence should be shown first for the project goal.
- Preserve provenance by linking summaries to source snippets.
- Avoid letting the AI make the final decision for the user.
- Coordinate with frontend on practical rendering limits.
- Coordinate with backend on evidence fields and confidence metadata.

### Deliverables

- Display payload schema.
- Overlay payload examples.
- Comparison tray payload examples.
- Provenance and uncertainty display rules.
- Frontend integration notes.

### Not Owned

- Natural-language intent parsing.
- Supabase deployment.
- Low-level frontend component implementation, unless integrating with frontend.

## Cross-Role Contracts

### Frontend To AI NL Agent

Frontend provides:

- raw user command
- current demo name
- visible UI registry
- current selected items
- current study condition

### AI NL Agent To Backend

AI NL agent sends:

- intent
- selected item references
- criteria
- filters
- repair operation, if any
- requested data type

### Backend To AI Display Agent

Backend returns:

- item metadata
- evidence snippets
- generated or stored summaries
- source IDs
- confidence or uncertainty metadata

### AI Display Agent To Frontend

Display agent returns:

- overlays
- tray entries
- snippet groups
- warnings
- display mode

## Merge Rule

Each role should normally edit its own owner paths. If a change modifies a cross-role contract, update the relevant docs and request review from the affected role before merging into `dev`.
