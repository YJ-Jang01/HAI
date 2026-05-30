# AI Agent Instructions

Keep this repository role-oriented and simple. Development code should stay inside the role directory that owns it.

## Main Targets

- Work in `frontend/Amazon/` for the shopping/product-comparison demo.
- Work in `frontend/Netflix/` only when the task explicitly targets the media/OTT demo.
- Work in `backend/` for DB schema, Supabase, deployment, and API docs.
- Work in `ai/nl-request-agent/` for natural-language command recognition and backend task requests.
- Work in `ai/display-agent/` for UI-ready display payload generation.
- Work in `ai/shared/` for shared AI contracts and examples.

The demo names are temporary. Do not rename or move these folders unless the user explicitly asks.

## Docs To Read

- `docs/PROJECT.md`: project goal and feature scope.
- `docs/IMPLEMENTATION.md`: current implementation plan and backlog.
- `docs/ROLES.md`: team responsibility split.
- `docs/BRANCHING.md`: branch and merge workflow.
- `docs/STUDY.md`: user-study and logging needs.

Use `docs/archive/Proposal-1.md` only for historical context.

## Rules

- Use fixed role branches: `frontend`, `backend`, `ai-nl`, and `ai-display`.
- Keep app-local data inside the app directory unless backend needs shared seed data.
- Update docs only when behavior, data shape, or study flow changes.
- Prefer small changes over broad restructuring.
- Do not store secrets, API keys, or participant private data.
