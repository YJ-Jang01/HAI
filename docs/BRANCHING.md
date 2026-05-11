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

- Each role works on its fixed role branch.
- Role branches merge back into `dev`.
- `dev` can be unstable while features are being integrated, but it should be restored to a runnable state before merging to `main`.

## Role Branches

Use fixed role branches:

```text
frontend
backend
ai-nl
ai-display
```

Optional docs-only changes can be made on the role branch related to the change. If the docs affect everyone, use `dev` directly only after team agreement.

Do not create many task-specific branches unless the team explicitly decides to switch workflows.

## Recommended Workflow

1. Pull latest `dev`.
2. Switch to your fixed role branch.
3. Merge or rebase latest `dev` into your role branch before starting work.
4. Work only in your owned area when possible.
5. Update docs if the contract or behavior changes.
6. Run the relevant demo or validation checks.
7. Push your role branch.
8. Open a pull request from your role branch into `dev`.
9. Request review from any role affected by your change.
10. Merge to `dev` after conflicts and contract changes are resolved.
11. Periodically merge `dev` to `main` for deployment/demo checkpoints.

## Ownership Rules

## `frontend`

Primary paths:

- `frontend/Amazon/`
- `frontend/Netflix/`

Needs review from backend or AI if API contracts or AI payload rendering changes.

## `backend`

Primary paths:

- `backend/`

Needs review from frontend and AI if endpoint payloads change.

## `ai-nl`

Primary paths:

- `ai/nl-request-agent/`
- `ai/shared/`

Needs review from backend if task request schemas change.

## `ai-display`

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
