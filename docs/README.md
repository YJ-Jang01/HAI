# Docs

Active project documentation for the AImazon Amazon Reviews 2023 shopping and comparison study.

## Active Docs

- `PROJECT.md`: product goal, scope, users, scenarios, and requirements.
- `IMPLEMENTATION.md`: app structure, current implementation plan, data/logging notes, and backlog.
- `SERVICE_DATA_FLOW.md`: AI service flow, query-safety rules, and frontend/backend/AI contracts.
- `ROLES.md`: frontend, backend, and AI responsibility split.
- `BRANCHING.md`: branch naming, merge workflow, and ownership.
- `STUDY.md`: research questions, study conditions, tasks, metrics, and procedure.
- `screenshots/`: UI/UX screenshots captured from the local running app.
- `archive/Proposal-1.md`: original proposal kept for historical reference only.

## Runtime References

- `../README.md`: full-project run guide, feature list, file/function map, screenshot gallery.
- `../frontend/Amazon/README.md`: frontend components, user flows, screenshots, and run guide.
- `../backend/README.md`: Supabase, Amazon 2023 import, AI routes, and backend function map.
- `../backend/api-docs/amazon2023-api.md`: current Amazon 2023 API contract.
- `../backend/api-docs/amazon-ai-api.md`: AI Criteria Lens API contract.
- `../backend/deployment/amazon2023-cutover-runbook.md`: dataset cutover procedure.

## Screenshot Inventory

Screenshots were captured against:

- Frontend: `http://127.0.0.1:8000`
- Backend: `http://127.0.0.1:8002`

Files:

- `screenshots/aimazon-home.png`
- `screenshots/aimazon-search-filters.png`
- `screenshots/aimazon-ai-criteria.png`
- `screenshots/aimazon-comparison-matrix.png`
- `screenshots/aimazon-source-snippets.png`
- `screenshots/aimazon-detail-add-to-cart.png`
- `screenshots/aimazon-added-to-cart.png`
- `screenshots/aimazon-cart.png`
- `screenshots/aimazon-checkout-click.png`

## Rule

Keep docs tied to the implemented runtime. If behavior, API shape, study flow, or screenshots change, update the relevant README and the detailed doc in the same change.
