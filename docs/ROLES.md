# Team Roles

The project is split into four development responsibilities. Each role has a clear owner path so work can happen in parallel and merge into `dev` with fewer conflicts.

## 1. Frontend

### Owner Paths

- `frontend/`
- `frontend/Amazon/`

### Main Responsibility

Frontend implements the AImazon shopping demo and the UI states needed for product search, AI criteria clarification, comparison, and study logging.

### Detailed Responsibilities

- Build and maintain the Amazon shopping demo page.
- Implement grids, cards, detail modals, selection states, filters, AI Criteria Lens controls, comparison matrix, and study-condition UI.
- Render backend data and AI display-agent payloads on screen.
- Add frontend logging hooks for user-study events.
- Keep the demo runnable locally.

### Deliverables

- Working `frontend/Amazon/` demo.
- UI states for baseline browsing, AI criteria parsing, ambiguity clarification, comparison, evidence snippets, and repair/undo if implemented.
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

Backend designs and deploys the Amazon Reviews 2023 data layer and API surface used by frontend and AI modules.

### Detailed Responsibilities

- Design the shopping database schema.
- Set up Supabase.
- Write migrations, import scripts, verification scripts, and local setup instructions.
- Define API endpoints and response contracts.
- Deploy backend services or document deployment steps.
- Write API documentation.
- Store and serve products, images, attributes, reviews, semantic signals, evidence snippets, AI task results, interaction logs, and final participant choices.

### Deliverables

- Supabase schema and migration plan.
- Amazon Reviews 2023 import and verification scripts.
- API docs with request/response examples.
- Deployment guide or deployed Supabase/backend instance.
- Logging endpoint or logging storage plan.

### Not Owned

- Visual UI rendering.
- Natural-language parsing logic.
- Display optimization logic for overlays/matrices.

## 3. AI Developer 1: Natural-Language Request Agent

### Owner Paths

- `ai/nl-request-agent/`
- shared request schema files in `ai/shared/`

### Main Responsibility

AI Developer 1 recognizes user natural-language product-search commands and turns them into structured backend task requests.

### Detailed Responsibilities

- Parse user commands such as:
  - "comfortable commute shoes under 120 dollars for women"
  - "여성용 겨울 출근 코트 120달러 이하"
  - "방수되는 남성용 겨울 부츠"
  - "면 소재 데일리 셔츠"
- Detect intent, criteria, ambiguity, repair commands, and requested evidence.
- Resolve references using frontend-provided context.
- Convert parsed intent into a backend request.
- Coordinate with backend on required fields and error handling.

### Deliverables

- Command parser or LLM prompt pipeline.
- Structured task request schema.
- Example command set for Amazon product search and comparison.
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

AI Developer 2 transforms backend/AI return data into display-ready payloads that help the user compare products efficiently.

### Detailed Responsibilities

- Convert backend data into criteria strips, comparison matrix entries, snippet groups, warnings, uncertainty cues, and summaries if needed.
- Decide what evidence should be shown first for the project goal.
- Preserve provenance by linking summaries to source snippets.
- Avoid letting the AI make the final decision for the user.
- Coordinate with frontend on practical rendering limits.
- Coordinate with backend on evidence fields and confidence metadata.

### Deliverables

- Display payload schema.
- Criteria/comparison/snippet payload examples.
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

- criteria rows
- comparison entries
- snippet groups
- warnings
- display mode

## Merge Rule

Each role should normally edit its own owner paths. If a change modifies a cross-role contract, update the relevant docs and request review from the affected role before merging into `dev`.
