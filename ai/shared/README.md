# AI Shared

Shared helpers and contract models for the optional Python AI modules.

## Files

- `models.py`: shared Pydantic request/response models.
- `env.py`: environment variable loading helpers.
- `db.py`: shared database/client helper for experiments.

## Rule

Do not duplicate request or display shapes independently across AI modules. If a shared shape changes, update:

- `ai/shared/models.py`
- `backend/api-docs/amazon-ai-api.md`
- `backend/api-docs/amazon2023-api.md`
- `docs/SERVICE_DATA_FLOW.md`
