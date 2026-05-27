# Amazon Human-Authored Fixture Progress

Last updated: 2026-05-27

## Policy

- Product/review prose in `batches/*.json` is written directly by Codex.
- Code may validate, merge, and upload batch files, but must not generate review sentences.
- The previous rule-generated Amazon v2 fixture was removed from `backend/fixtures/amazon/`.
- The previous sentence-template generator was removed.

## Current Progress

| Batch | Status | Products | Reviews | Evidence | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| `batch-001.json` | validated and seeded | 3 | 9 | 36 | Outerwear, shirt, backpack |
| `batch-002.json` | validated and seeded | 3 | 9 | 36 | Footwear, trouser, linen tee |

Current total:

- Products: 6
- Reviews: 18
- Review profiles: 18
- Evidence rows: 72

DB seed status:

- `npm run db:seed:amazon` completed after switching to the human-authored batch fixture.
- Current Supabase Amazon catalog now contains only the 2 completed batches listed above.

Next IDs:

- Product ID: 7
- Review ID: 19
- Evidence ID: 73

## Remaining Work

The target remains a broad shopping dataset, but it must be filled batch-by-batch with directly authored content. Do not regenerate the old mechanical 400-product/10,000-review fixture.
