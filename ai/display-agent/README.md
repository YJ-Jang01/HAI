# Display Agent

Owner: AI Developer 2.

## Responsibility

Transform backend/AI results into UI-ready display decisions that support the project goal: efficient in-place comparison.

## Inputs

- Backend item data.
- Review snippets or evidence sources.
- AI summaries or generated comparison output.
- Current frontend selection state.
- Current study condition.

## Outputs

UI-ready display model:

- overlays
- comparison tray entries
- snippet expansion data
- warnings or uncertainty cues
- repair suggestions

## Initial Display Modes

- `in_place_overlay`
- `comparison_tray`
- `chat_panel`
- `detail_modal_summary`

## Development Notes

The display agent should not decide the user's final choice. It should expose evidence clearly and keep user control visible.
