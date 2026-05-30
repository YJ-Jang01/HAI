# AI

AI development is split between two people and two modules.

## Roles

### AI Developer 1: Natural-Language Request Agent

Owns `ai/nl-request-agent/`.

Goal:

- Recognize user natural-language commands.
- Convert the command into a structured backend/agent task request.
- Decide what data or action the backend should provide.

Example:

User says:

> Compare 2, 5, and the cheapest wireless one for battery complaints.

The module should produce a structured request such as:

```json
{
  "intent": "compare_items",
  "selectedItems": [
    { "type": "visible_number", "value": 2 },
    { "type": "visible_number", "value": 5 },
    { "type": "attribute_query", "value": "cheapest wireless" }
  ],
  "criteria": ["battery", "negative_reviews"],
  "targetDemo": "Amazon"
}
```

### AI Developer 2: Display Agent

Owns `ai/display-agent/`.

Goal:

- Take returned backend/AI data.
- Transform it into UI-ready evidence overlays, comparison tray entries, and display states.
- Decide how to present evidence efficiently for the project goal.

Example output:

```json
{
  "displayMode": "in_place_overlay",
  "overlays": [
    {
      "itemId": "product-1",
      "summary": "Strong battery reviews, but ANC-heavy use has some complaints.",
      "evidenceCount": 4,
      "snippets": ["..."]
    }
  ],
  "tray": {
    "items": ["product-1", "product-5"],
    "criteria": ["battery", "negative_reviews"]
  }
}
```

## Directory Layout

```text
ai/
|-- nl-request-agent/
|-- display-agent/
`-- shared/
```

## Shared Contracts

Use `ai/shared/` for schemas or examples shared by both AI modules.

Do not duplicate request/response shapes independently. If the contract changes, update:

- `ai/shared/`
- `backend/api-docs/`
- `docs/IMPLEMENTATION.md`
