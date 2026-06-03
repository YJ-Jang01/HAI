# Natural-Language Request Agent

Owner: AI Developer 1.

## Responsibility

Convert natural-language user input into a structured task request for backend/AI processing.

## Inputs

- Raw user command.
- Current demo name: `Amazon` or `Netflix`.
- Visible UI registry from frontend.
- Current selected items, if any.
- Current study condition, if any.

## Outputs

Structured request object:

- intent
- selected item references
- criteria
- filters
- repair operation, if any
- required backend data

## Initial Intents

- `select_items`
- `compare_items`
- `filter_evidence`
- `repair_selection`
- `clear_selection`
- `request_details`

## Development Notes

For the current Amazon AI Criteria Lens flow, this agent is an always-on runtime dependency. The backend calls this service first, then validates the returned intent against backend-owned catalog taxonomy, attribute definitions, and range facets before querying Supabase.

If Gemini is temporarily unavailable, this service returns a temporary Codex-authored fallback intent instead of failing the whole flow. That fallback only emits coarse category/product-type hints, explicit price ranges, and DB-backed attribute hints. The backend still performs the final taxonomy and attribute validation, so arbitrary filters are not executed.

## Local Runtime

The backend expects this service at `http://127.0.0.1:8011` by default.

```powershell
uv run uvicorn main:app --host 127.0.0.1 --port 8011
```

`GEMINI_API_KEY` must be available in the process environment, a local `.env` file, or `backend/.env`.
For local compatibility, `GEMINI_KEY` and `gemini_key` are also accepted.
