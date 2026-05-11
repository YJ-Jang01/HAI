# Branching And Merge Workflow

Use `main` and `dev`.

## Main Branches

### `main`

Stable deployment branch.

- Keep it runnable.
- Use it for final demos and deployment.
- Merge into `main` only from `dev` after integration testing.

### `dev`

Integration branch for active development.

- Everyone branches from latest `dev`.
- Role branches merge back into `dev`.
- `dev` can be unstable while features are being integrated, but it should be restored to a runnable state before merging to `main`.

## Role Branches

Use role-based branch prefixes:

```text
frontend/<short-task>
backend/<short-task>
ai-nl/<short-task>
ai-display/<short-task>
docs/<short-task>
```

Examples:

```text
frontend/amazon-numbered-cards
backend/supabase-schema
ai-nl/command-parser
ai-display/evidence-overlay-payload
docs/study-plan-update
```

## Recommended Workflow

1. Pull latest `dev`.
2. Create a role branch from `dev`.
3. Work only in your owned area when possible.
4. Update docs if the contract or behavior changes.
5. Run the relevant demo or validation checks.
6. Open a pull request into `dev`.
7. Request review from any role affected by your change.
8. Merge to `dev` after conflicts and contract changes are resolved.
9. Periodically merge `dev` to `main` for deployment/demo checkpoints.

## Ownership Rules

## Frontend Branches

Primary paths:

- `frontend/Amazon/`
- `frontend/Netflix/`

Needs review from backend or AI if API contracts or AI payload rendering changes.

## Backend Branches

Primary paths:

- `backend/`

Needs review from frontend and AI if endpoint payloads change.

## AI NL Branches

Primary paths:

- `ai/nl-request-agent/`
- `ai/shared/`

Needs review from backend if task request schemas change.

## AI Display Branches

Primary paths:

- `ai/display-agent/`
- `ai/shared/`

Needs review from frontend if UI payloads change.

## Contract Change Rule

If a change affects communication between roles, update all relevant docs in the same pull request:

- `docs/IMPLEMENTATION.md`
- `backend/api-docs/`
- `ai/shared/`
- frontend integration notes if needed

## Deployment Rule

Deploy from `main`, not directly from role branches. If an urgent fix is needed, branch from `main`, fix, merge to `main`, then back-merge into `dev`.

## Merge Conflict Prevention

- Keep large rewrites rare.
- Avoid editing another role's files unless required.
- Put shared schemas in `ai/shared/` or `backend/api-docs/` instead of copying them.
- Communicate before changing payload names or data shapes.
