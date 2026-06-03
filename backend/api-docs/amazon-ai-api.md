# Amazon AI Criteria Lens API

## Base Path

```text
/api/ai/amazon
```

These endpoints implement the AI Criteria Lens flow for the Amazon demo. The frontend sends natural-language intent to backend only. Backend calls the NL/display agents, validates the result against Supabase-backed taxonomy and attributes, queries the existing Amazon catalog/review/evidence tables, and returns compact UI-ready payloads.

The current UI flow treats natural-language parsing as always on for typed search queries. The search-bar icon remains an AI Criteria Lens state control/indicator, but users do not need to enable it before submitting a query.

The current UI flow is:

1. `POST /interpret` parses the natural-language query into visible criteria and ambiguity options.
2. The frontend renders the parsed criteria bar immediately.
3. `POST /query` uses the returned `queryId` to fetch product candidates while the user can adjust ambiguous criteria.
4. The search result grid remains the primary shopping surface.
5. Users add/remove products from the grid into the comparison matrix at the bottom of the same page.
6. `POST /compare` refreshes the matrix whenever selected products or active criteria change.
7. `POST /refine` handles explicit refine actions or criteria overrides.

The API accepts English and Korean user queries. Korean product and attribute terms are normalized into the same backend-owned taxonomy and attribute filters as English terms. The frontend may send `visibleContext.locale` and `session.locale` as `en` or `ko`; locale is used as request context and response localization context, while product grounding still depends on the same Supabase catalog data. When locale is `ko`, returned item names, evidence snippets, and lazy-loaded product detail content are Korean UI-ready text.

## Runtime Requirements

Default local service URLs:

```text
Backend:        http://127.0.0.1:8002
NL agent:       http://127.0.0.1:8011
Display agent:  http://127.0.0.1:8012
```

Backend environment variables:

```text
NL_REQUEST_AGENT_URL=http://127.0.0.1:8011
DISPLAY_AGENT_URL=http://127.0.0.1:8012
AI_AGENT_TIMEOUT_MS=8000
AI_AGENT_RETRY_COUNT=2
AI_DISPLAY_AGENT_ENABLED=true
AI_QUERY_ITEM_LIMIT=36
AI_FACET_CACHE_TTL_MS=60000
```

Each Python agent also needs a Gemini key available in its process environment, local `.env` file, or `backend/.env`.
Accepted names are `GEMINI_API_KEY`, `GEMINI_KEY`, and `gemini_key`.

The NL request agent is a required runtime dependency for AI Criteria Lens. Backend does not silently fall back to a local parser for user-facing AI search. It calls the NL agent first, then validates and maps the agent output to backend-owned taxonomy, attribute definitions, range facets, and product evidence before querying Supabase.

For local/demo resilience, the NL agent itself may return a temporary Codex-authored fallback intent when Gemini is unavailable. That fallback only provides coarse taxonomy hints, explicit price ranges, and DB-backed attribute hints. Backend validation remains mandatory, so arbitrary or non-catalog filters are ignored.

If the NL agent is unavailable, backend returns:

```json
{
  "error": {
    "code": "AI_AGENT_UNAVAILABLE",
    "message": "NL request agent is unavailable or returned an invalid response."
  }
}
```

The display agent is non-blocking. If it is unavailable, backend still returns the validated UI payload and includes a warning in `interpretation.appliedRules`.

Local validation command:

```powershell
pnpm run ai:qa:amazon
```

The AI edge-flow QA command submits Korean and English messy natural-language queries, verifies that parsed criteria use DB-backed taxonomy/attribute keys, and checks the side-effect contracts for search submit, clarification override, compare selection, and evidence loading. The latest report is written to `backend/reports/amazon-ai-edge-flow-test-latest.md`.

## POST `/interpret`

Parses the user query into backend-grounded criteria and clarification choices without returning product cards. Use this first so the UI can show decomposed attributes before the heavier product query finishes.

Request:

```json
{
  "query": "beautiful coat for winter commute under $120",
  "visibleContext": {
    "page": "products",
    "locale": "en",
    "currentFilters": {},
    "visibleProductIds": [],
    "selectedProductIds": [],
    "sort": "relevance"
  },
  "session": {
    "sessionId": "local-amazon-session",
    "locale": "en"
  }
}
```

Response:

```json
{
  "queryId": "aiq_abc123",
  "status": "planning",
  "interpretation": {
    "summary": "Outerwear / Coats",
    "appliedRules": [
      "Category: Outerwear > Coats",
      "Price: under $120",
      "Season: winter",
      "Use: commute"
    ],
    "warning": "AI parsed criteria were validated against backend-owned taxonomy and attribute definitions."
  },
  "parsedCriteria": [
    {
      "key": "productType",
      "label": "Product type",
      "value": "coats",
      "displayValue": "Coats",
      "status": "applied",
      "source": "catalog_taxonomy"
    },
    {
      "key": "style",
      "label": "Style",
      "value": null,
      "displayValue": "Choose one",
      "status": "ambiguous",
      "source": "user_clarification"
    }
  ],
  "clarifications": [
    {
      "key": "style",
      "label": "Style",
      "question": "What should beautiful mean here?",
      "selectedValue": null,
      "options": [
        { "value": "office", "label": "Office", "estimatedCount": 18 },
        { "value": "minimal", "label": "Minimal", "estimatedCount": 24 },
        { "value": "classic", "label": "Classic", "estimatedCount": 31 }
      ]
    }
  ],
  "comparisonDimensions": [],
  "estimatedTotal": 42,
  "actions": []
}
```

## POST `/query`

Runs an AI Criteria Lens search.

Request:

```json
{
  "queryId": "aiq_abc123",
  "query": "warm winter commute coat not too expensive, compare material and review risks",
  "criteriaOverrides": [
    {
      "key": "style",
      "value": "minimal"
    }
  ],
  "visibleContext": {
    "page": "products",
    "locale": "en",
    "currentFilters": {},
    "visibleProductIds": [],
    "selectedProductIds": [],
    "sort": "relevance"
  },
  "session": {
    "sessionId": "local-amazon-session",
    "locale": "en",
    "participantId": null
  }
}
```

Response:

```json
{
  "queryId": "aiq_abc123",
  "status": "ok",
  "interpretation": {
    "summary": "outerwear / coats",
    "appliedRules": [
      "Category: outerwear > coats",
      "Price: lower range of matched products",
      "Season: winter",
      "Warmth: high",
      "Use: commute"
    ],
    "warning": "AI output was validated against backend-owned taxonomy, attributes, and evidence before querying Supabase."
  },
  "parsedCriteria": [
    {
      "key": "priceMax",
      "label": "Price",
      "value": 120,
      "displayValue": "Under $120",
      "status": "ambiguous",
      "source": "price_range"
    }
  ],
  "clarifications": [
    {
      "key": "priceMax",
      "label": "Price",
      "question": "How strict should the price limit be?",
      "selectedValue": "under_p40",
      "options": [
        { "value": "under_p40", "label": "Under $90", "estimatedCount": 14 },
        { "value": "under_p70", "label": "Under $135", "estimatedCount": 28 },
        { "value": "value_ranked", "label": "Value-ranked", "estimatedCount": 42 }
      ]
    }
  ],
  "comparisonDimensions": [
    {
      "key": "price",
      "label": "Price",
      "source": "base_product_field",
      "dataType": "number",
      "active": true,
      "hasEvidence": false
    },
    {
      "key": "material",
      "label": "Material",
      "source": "product_attribute_definitions",
      "dataType": "enum",
      "active": true,
      "hasEvidence": true
    }
  ],
  "items": [
    {
      "id": "product-uuid",
      "visibleNumber": 1,
      "name": "Northvale Harbor Wool Coat",
      "imageUrl": "https://example.com/product.jpg",
      "price": {
        "amount": 99.99,
        "currencyCode": "USD"
      },
      "rating": 4.4,
      "reviewCount": 52,
      "decisionEvidence": {
        "primaryDifferentiator": "High warmth",
        "reasons": ["High warmth", "Wool Blend material"],
        "tradeoffs": ["too heavy"],
        "evidenceStrength": "strong",
        "comparisonDimensions": ["price", "reviewRisks", "material"],
        "snippetsPreview": [
          {
            "sentiment": "negative",
            "attributeKey": "weightGrams",
            "issueType": "too_heavy",
            "text": "The coat felt heavier than I wanted."
          }
        ]
      }
    }
  ],
  "actions": [
    {
      "type": "refine",
      "label": "Prioritize material quality",
      "command": "prioritize material quality"
    }
  ],
  "pagination": {
    "limit": 12,
    "nextCursor": null,
    "total": 18
  }
}
```

Backend resolves subjective terms through backend-owned rules and current facets:

| User phrase | Backend basis |
| --- | --- |
| `not too expensive` | price p40 among matched candidates |
| `under $120` / `below $120` | hard `priceMax=120`; backend does not silently relax this range |
| `good reviews` | rating/review-count p70 among matched candidates |
| `warm winter` | `season=winter`, `warmthLevelMin=4` |
| `lightweight` | `weightGramsMax=p40` |
| `commute/work` | `occasion=commute` or `office` |

Korean examples are handled by the same grounding path:

| User phrase | Backend basis |
| --- | --- |
| `겨울 출근용 따뜻한 코트` | `category=outerwear`, `subCategory=coats`, `season=winter`, `warmthLevelMin=4`, `occasion=commute/office` |
| `가벼운 백팩` | `category=bags`, `subCategory=backpacks`, `weightGramsMax=p40` |
| `방수되는 운동화` | `category=footwear`, `subCategory=sneakers`, `waterproof=true` |

## GET `/query/:queryId/items/:productId/evidence`

Lazy-loads evidence for one product if a future UI needs detailed provenance. The current Amazon UI does not open a drawer by default; it keeps comparison in the result grid and bottom matrix.

Optional query:

```text
?dimension=reviewRisks
```

Response:

```json
{
  "queryId": "aiq_abc123",
  "productId": "product-uuid",
  "dimension": "reviewRisks",
  "evidence": [
    {
      "sentiment": "negative",
      "attributeKey": "weightGrams",
      "attributeLabel": "Weight",
      "issueType": "too_heavy",
      "severity": 4,
      "text": "The coat felt heavier than I wanted.",
      "source": "generated",
      "reviewId": "review-uuid"
    }
  ]
}
```

## POST `/compare`

Builds a compact comparison matrix for 2-4 selected products. The frontend calls this whenever selected products or active criteria change. The matrix is rendered at the bottom of the search result grid page, not in a drawer.

Request:

```json
{
  "queryId": "aiq_abc123",
  "selectedProductIds": ["product-uuid-1", "product-uuid-2"],
  "activeDimensions": ["price", "material", "reviewRisks"]
}
```

Response:

```json
{
  "queryId": "aiq_abc123",
  "comparison": {
    "dimensions": ["Price", "Material", "Review Risks"],
    "rows": [
      {
        "productId": "product-uuid-1",
        "visibleNumber": 1,
        "name": "Northvale Harbor Wool Coat",
        "cells": {
          "price": "$99.99",
          "material": "Wool Blend",
          "reviewRisks": "too heavy"
        }
      }
    ]
  }
}
```

## POST `/refine`

Applies a repair/refine command without opening a chat panel.

Request:

```json
{
  "queryId": "aiq_abc123",
  "command": "prioritize material quality, hide thin-evidence products",
  "currentSelectedProductIds": ["product-uuid-1", "product-uuid-2"],
  "activeDimensions": ["price", "material", "reviewRisks"],
  "criteriaOverrides": [
    {
      "key": "priceMax",
      "value": "under_p70"
    }
  ]
}
```

Response:

```json
{
  "queryId": "aiq_abc123",
  "status": "ok",
  "updateSummary": "Updated lens: prioritize material quality, hide thin-evidence products",
  "removedItems": [],
  "addedItems": [],
  "parsedCriteria": [],
  "clarifications": [],
  "comparisonDimensions": [],
  "items": [],
  "actions": [
    {
      "type": "undo",
      "label": "Undo",
      "command": "undo_last_refine"
    }
  ]
}
```

## Notes

- The frontend never calls LLM providers, Python agents, or Supabase directly.
- The backend never lets AI output write SQL or arbitrary endpoint URLs.
- Initial interpretation responses include parsed criteria and ambiguity options only.
- Product-card responses stay compact. Detailed evidence remains available as an API, but the current UI does not use a drawer.
- Product image/name clicks remain product-detail navigation. Compare buttons add/remove products from the bottom matrix.
- The current `queryId` context is stored in backend memory for the local/demo runtime.
