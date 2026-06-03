# Amazon AI-Ready Fixture Progress

Last updated: 2026-06-02

## Policy

- `seed/batch-v3-*.json` remains the validated baseline dataset.
- `seed/batch-v4-*.json` is the cumulative expansion series. When v4 files exist, the seeder and validator load `batch-v3-*` plus `batch-v4-*` together.
- `archive/` keeps historical direct-authored, curated-source, and normalized `src_op` files for traceability. These files are not loaded into Supabase.
- Code may validate, normalize, merge, and upload batch files.
- The current v3 builder uses deterministic synthetic generation with seeded random product popularity, latent quality/risk profiles, market patterns, rating polarity, review metadata, evidence count variation, category-specific issue clusters, positive-only products, targeted fit/use complaints, and broader petite/tall/plus reviewer coverage.
- v4 expansion batches must be directly authored by Codex. Do not use Gemini, external LLM APIs, or rule-based sentence generation for product/review/evidence prose.
- The previous rule-generated Amazon v2 fixture was removed from `backend/fixtures/amazon/`.

## Current Progress

| Batch | Status | Products | Reviews | Profiles | Evidence | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `seed/batch-v3-001.json` ... `seed/batch-v3-028.json` | validated + uploaded | 420 | 11,335 | 11,335 | 58,371 | Baseline seed dataset |
| `seed/batch-v4-001.json` | validated + uploaded | 8 | 40 | 40 | 160 | First direct-authored cumulative expansion batch |
| `seed/batch-v4-002.json` | validated + uploaded | 50 | 250 | 250 | 500 | Direct-authored product expansion batch |
| `seed/batch-v4-003.json` | validated + uploaded | 2 | 10 | 10 | 40 | Targeted direct-authored coverage for rainy commute sneakers and travel duffel pocket queries |
| `seed/batch-v4-004.json` | validated + uploaded | 8 | 40 | 40 | 160 | Direct-authored commute, office, and daily bag coverage for broad budget searches |
| `seed/batch-v4-005.json` | validated + uploaded | 8 | 40 | 40 | 160 | Direct-authored coverage for rain commute outerwear, office tops, wide footwear, trousers, and washable dresses |
| `archive/direct-authored/batch-001.json` ... `archive/direct-authored/batch-005.json` | historical | 20 | 100 | 100 | 400 | Preserved direct-authored v2 source; not loaded |
| `archive/src-op/batch-src-op-001.json` ... `archive/src-op/batch-src-op-002.json` | historical | 109 | 618 | 618 | 2,472 | Preserved normalized `src_op` source; not loaded |

Current validated local seed total:

- Products: 496
- Reviews: 11,715
- Review profiles: 11,715
- Evidence rows: 59,391
- Attribute definitions: 28
- v4 target: 1,680 products total, reached through cumulative batches.

Validation status:

- Every product has 5 to 80 reviews.
- Every review has 2 to 8 evidence rows.
- Average evidence per review is at least 5.
- Product `rating`, `reviewCount`, and `ratingDetail` are recalculated from imported reviews.
- Product ratings preserve a realistic positive skew while keeping low-rated products and repeated defects visible.
- Products with enough negative evidence must show useful issue structure: most products expose repeated issue patterns, while polarizing products may intentionally split complaints across several issue types.
- The dataset must include positive-only products, high-rating low-review products, and high-rating products with targeted complaint evidence.
- Petite, tall, and plus reviewer profiles must meet minimum coverage thresholds for fit/body summaries.
- Duplicate review body count must be 0.
- Repeated titles and evidence snippets are capped.
- Footwear, Bags, and Accessories reject obvious apparel-only context mismatches.
- Evidence text must be present in the review body.
- Review metadata includes helpful votes, verified-purchase flag, source, and review image count.

DB seed status:

- `npm run db:migrate` completed through `drizzle/0005_amazon_review_metadata.sql`.
- `pnpm run db:seed:amazon` completed for the 2026-06-02 cumulative v3+v4 dataset.
- `pnpm run db:verify:amazon` confirmed the live Supabase Amazon catalog contains 496 products, 11,715 reviews, 11,715 profiles, 59,391 evidence rows, and 28 attributes.
- Live DB verification also confirmed median product rating 4.1, average product rating 4.04, 281 products rated 4.0+, 26 positive-only products, 35 high-rating low-review products, 191 high-rating products with complaint evidence, 0 duplicate review bodies, 0 evidence-text mismatches, 0 category-context mismatches, and complete primary/description/brand image coverage for all 496 products.
- `pnpm run query:test:amazon` passed for API/contract failures on the 100-query natural-language corpus. Six cases remain classified as hard data shortages under strict price plus subcategory constraints.

Next IDs:

- Product ID next candidate: 497
- Review ID next candidate: 11,716
- Evidence ID next candidate: 59,392

## Remaining Work

Continue adding direct-authored `seed/batch-v4-*.json` files until the cumulative seed reaches the 1,680-product target. The data is still synthetic demo data. Formal user-study gold data should be manually reviewed and marked `reviewed` or `approved` before evaluation use.
