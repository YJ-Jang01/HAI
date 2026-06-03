# AI Modules

This directory keeps experimental AI services and shared contracts for AImazon. The current production-like AI Criteria Lens path is implemented in the Node backend at `backend/src/routes/amazon2023-ai.ts`, which calls Gemini directly when a key is configured.

The Python services here remain useful for experiments, contract prototyping, or future service extraction, but the current frontend does not need them running.

## Layout

```text
ai/
|-- nl-request-agent/
|-- display-agent/
`-- shared/
```

## Current Runtime Path

```text
frontend/Amazon
  -> backend POST /api/ai/amazon2023/query
  -> backend/src/routes/amazon2023-ai.ts
  -> Gemini REST API when GEMINI_API_KEY is available
  -> Supabase-backed catalog/search/evidence validation
  -> frontend criteria, clarification, grid, matrix, snippets
```

## Module Roles

- `nl-request-agent/`: experimental natural-language parser service. It can be used to prototype intent extraction, selected item references, criteria, and repair commands.
- `display-agent/`: experimental display payload service. It can be used to prototype overlays, matrix rows, evidence snippets, warnings, and display states.
- `shared/`: shared schemas and helpers for the Python AI modules.

## Shared Contract Rule

If a shape is used by multiple AI modules, put it in `ai/shared/` and keep backend API docs aligned:

- `backend/api-docs/amazon-ai-api.md`
- `backend/api-docs/amazon2023-api.md`
- `docs/SERVICE_DATA_FLOW.md`

## Gemini Keys

For the current backend runtime, configure Gemini in `backend/.env`:

```text
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash-lite
AI_AMAZON2023_LLM=on
```

Do not commit API keys.
