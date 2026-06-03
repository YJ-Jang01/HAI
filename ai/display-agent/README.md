# Display Agent

Experimental Python service for turning backend/AI evidence into UI-ready display payloads. The current AImazon frontend builds the active display state directly in React from backend responses, so this service is optional unless the team extracts display planning into a separate process.

## Intended Responsibility

- Transform product, review, evidence, and AI criteria data into display decisions.
- Propose overlays, matrix rows, evidence snippets, warnings, and uncertainty cues.
- Keep user control visible and avoid deciding the final product choice for the user.

## Example Output Shape

```json
{
  "displayMode": "comparison_matrix",
  "matrixRows": ["price", "brand", "comfortLevel", "fit", "reviewStrengths"],
  "overlays": [
    {
      "itemId": "B000EXAMPLE",
      "summary": "Strong comfort evidence, limited durability evidence.",
      "evidenceCount": 3
    }
  ],
  "warnings": ["Low review evidence for one selected item."]
}
```

## Local Run

```powershell
cd ai/display-agent
uv run uvicorn main:app --host 127.0.0.1 --port 8012
```

If used, provide a Gemini key through environment or a local `.env`:

```text
GEMINI_API_KEY=<key>
```

## Files

- `main.py`: FastAPI entrypoint.
- `agent.py`: display payload generation logic.
- `pyproject.toml`: Python dependencies.

## Current Frontend Counterpart

The currently implemented display behavior lives in:

- `frontend/Amazon/src/App.jsx`: `ComparisonMatrix`, `ComparisonInsights`, `ComparisonMatrixDock`, `ProductCard`, `DetailModal`, `CartPage`.
- `backend/src/routes/amazon2023-ai.ts`: comparison values and evidence availability.
