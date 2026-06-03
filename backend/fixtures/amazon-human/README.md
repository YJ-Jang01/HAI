# Amazon Human Fixture

This directory owns the backend Amazon demo seed data.

## Layout

```text
amazon-human/
|-- README.md
|-- PROGRESS.md
|-- attribute_taxonomy.json
|-- seed/
`-- archive/
    |-- direct-authored/
    |-- src-op/
    `-- curated-source/
```

- `seed/`: active Supabase seed input. `seed-amazon.ts` and the validator use this directory.
- `archive/direct-authored/`: earlier direct-authored batches kept for traceability.
- `archive/src-op/`: normalized `frontend/Amazon/src_op` imports kept for reference.
- `archive/curated-source/`: source prose for curated historical batches.

`seed/batch-v3-*.json` is the validated baseline. `seed/batch-v4-*.json` is the cumulative expansion series. When v4 files exist, `seed-amazon.ts` loads both v3 and v4 batches so partial v4 progress does not replace the existing catalog.

v4 prose must be directly authored by Codex. Do not use Gemini, external LLM APIs, or rule-based sentence generation for product names, descriptions, review bodies, or evidence snippets.

Each active seed product must include:

- `img`: one primary HTTP(S) image URL.
- `descImages`: at least one HTTP(S) description/detail image URL.
- `brandImages`: at least one HTTP(S) brand/context image URL.

The batch validator enforces these fields before upload. The DB verifier also checks that every Supabase Amazon product has `primary`, `description`, and `brand` rows in `product_assets`, so the frontend should not receive blank product image slots when it switches from local JSON to the backend API.
