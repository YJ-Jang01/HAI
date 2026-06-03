# Natural-Language Request Agent

Experimental Python service for natural-language intent extraction. The active AImazon runtime currently uses the Node backend route `backend/src/routes/amazon2023-ai.ts` and calls Gemini directly, so this service is optional unless the team decides to extract NL parsing into a separate process again.

## Intended Responsibility

- Convert user text into structured search or comparison intent.
- Identify selected item references.
- Extract criteria, filters, and repair/refine commands.
- Return only backend-executable fields that can be validated against catalog taxonomy and semantic attributes.

## Example Output Shape

```json
{
  "intent": "compare_items",
  "targetDemo": "Amazon",
  "selectedItems": [
    { "type": "visible_number", "value": 2 },
    { "type": "visible_number", "value": 5 }
  ],
  "criteria": ["comfort", "fit", "review_risks"],
  "filters": {
    "priceMax": 120,
    "genderTarget": ["women"]
  }
}
```

## Local Run

```powershell
cd ai/nl-request-agent
uv run uvicorn main:app --host 127.0.0.1 --port 8011
```

If used, provide a Gemini key through environment or a local `.env`:

```text
GEMINI_API_KEY=<key>
```

## Files

- `main.py`: FastAPI entrypoint.
- `agent.py`: parser logic and Gemini interaction.
- `pyproject.toml`: Python dependencies.

## Rule

Do not let this service execute arbitrary filters. Backend must still validate any returned intent against Amazon 2023 product fields, facets, semantic attributes, and review evidence.
