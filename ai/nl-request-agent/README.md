# Natural-Language Request Agent

Owner: AI Developer 1.

## Responsibility

Convert natural-language user input into a structured task request for backend/AI processing.

## Inputs

- Raw user command.
- Current demo name: `Amazon` or `Netflix`.
- Visible UI registry from frontend.
- Current selected items, if any.
- Current study condition, if any.

## Outputs

Structured request object:

- intent
- selected item references
- criteria
- filters
- repair operation, if any
- required backend data

## Initial Intents

- `select_items`
- `compare_items`
- `filter_evidence`
- `repair_selection`
- `clear_selection`
- `request_details`

## Development Notes

Start rule-based if needed. LLM integration can be added later, but the output contract should stay stable.
